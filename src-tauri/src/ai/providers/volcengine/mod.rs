use reqwest::{header, Client};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

use crate::ai::error::AIError;
use crate::ai::{AIProvider, GenerateRequest};

const GENERATE_URL: &str =
    "https://ark.cn-beijing.volces.com/api/v3/images/generations";

const SUPPORTED_MODELS: &[&str] = &["doubao-seedream-5-0-260128"];

pub struct VolcengineProvider {
    api_key: Arc<RwLock<Option<String>>>,
}

impl VolcengineProvider {
    pub fn new() -> Self {
        Self {
            api_key: Arc::new(RwLock::new(None)),
        }
    }
}

#[derive(Serialize)]
struct GenerateImageRequest<'a> {
    model: &'a str,
    prompt: &'a str,
    size: &'a str,
    response_format: &'a str,
    watermark: bool,
    sequential_image_generation: &'a str,
    stream: bool,
}

#[derive(Deserialize, Debug)]
struct ImageData {
    url: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GenerateImageResponse {
    data: Vec<ImageData>,
}

#[async_trait::async_trait]
impl AIProvider for VolcengineProvider {
    fn name(&self) -> &str {
        "volcengine"
    }

    fn supports_model(&self, model: &str) -> bool {
        let model = model.strip_prefix("volcengine/").unwrap_or(model);
        SUPPORTED_MODELS.contains(&model)
    }

    fn list_models(&self) -> Vec<String> {
        SUPPORTED_MODELS
            .iter()
            .map(|m| format!("volcengine/{m}"))
            .collect()
    }

    async fn set_api_key(&self, api_key: String) -> Result<(), AIError> {
        *self.api_key.write().await = Some(api_key);
        Ok(())
    }

    async fn generate(&self, request: GenerateRequest) -> Result<String, AIError> {
        let api_key = self
            .api_key
            .read()
            .await
            .clone()
            .ok_or_else(|| AIError::Provider("火山方舟 API key 未配置".to_string()))?;

        let model = request
            .model
            .strip_prefix("volcengine/")
            .unwrap_or(&request.model);

        info!(
            "Volcengine generate: model={}, size={}",
            model, request.size
        );

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .map_err(|e| AIError::Network(e.to_string()))?;

        let body = GenerateImageRequest {
            model,
            prompt: &request.prompt,
            size: &request.size,
            response_format: "url",
            watermark: false,
            sequential_image_generation: "disabled",
            stream: false,
        };

        let response = client
            .post(GENERATE_URL)
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::AUTHORIZATION, format!("Bearer {api_key}"))
            .json(&body)
            .send()
            .await
            .map_err(|e| AIError::Network(format!("请求失败: {e}")))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(AIError::Provider(format!(
                "火山方舟 API 错误 {status}: {text}"
            )));
        }

        let result: GenerateImageResponse = response
            .json()
            .await
            .map_err(|e| AIError::Json(format!("响应解析失败: {e}")))?;

        result
            .data
            .into_iter()
            .next()
            .and_then(|d| d.url)
            .ok_or_else(|| AIError::Provider("响应中无图片数据".to_string()))
    }
}
