import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, SlidersHorizontal, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AUTO_REQUEST_ASPECT_RATIO } from '@/features/canvas/domain/canvasNodes';
import {
  getModelProvider,
  type AspectRatioOption,
  type ImageModelDefinition,
  type ResolutionOption,
} from '@/features/canvas/models';
import {
  UiChipButton,
  UiModal,
  UiPanel,
  UiButton,
} from '@/components/ui';
import { useSettingsStore } from '@/stores/settingsStore';
import { openSettingsDialog } from '@/features/settings/settingsEvents';

interface ModelParamsControlsProps {
  imageModels: ImageModelDefinition[];
  selectedModel: ImageModelDefinition;
  selectedResolution: ResolutionOption;
  selectedAspectRatio: AspectRatioOption;
  aspectRatioOptions: AspectRatioOption[];
  onModelChange: (modelId: string) => void;
  onResolutionChange: (resolution: string) => void;
  onAspectRatioChange: (aspectRatio: string) => void;
  showWebSearchToggle?: boolean;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
  webSearchLabel?: string;
  showProviderName?: boolean;
  triggerSize?: 'md' | 'sm';
  chipClassName?: string;
  modelChipClassName?: string;
  paramsChipClassName?: string;
  modelPanelAlign?: 'center' | 'start';
  paramsPanelAlign?: 'center' | 'start';
  modelPanelClassName?: string;
  paramsPanelClassName?: string;
}

interface PanelAnchor {
  left: number;
  top: number;
}

function NanoBananaIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.5 19.824c0-.548.444-.992.991-.992h.744a.991.991 0 010 1.983H2.49a.991.991 0 01-.991-.991z" fill="#F3AD61" />
      <path d="M14.837 13.5h7.076c.522 0 .784-.657.413-1.044l-1.634-1.704a3.183 3.183 0 00-4.636 0l-1.633 1.704c-.37.385-.107 1.044.414 1.044zM3.587 13.5h7.076c.521 0 .784-.659.414-1.044l-1.635-1.704a3.183 3.183 0 00-4.636 0l-1.633 1.704c-.37.385-.107 1.044.414 1.044z" fill="#F9C23C" />
      <path d="M12.525 1.521c3.69-.53 5.97 8.923 4.309 12.744-1.662 3.82-5.248 4.657-9.053 6.152a3.49 3.49 0 01-1.279.244c-1.443 0-2.227 1.187-2.774-.282-.707-1.9.22-4.031 2.069-4.757 2.014-.79 3.084-2.308 3.89-4.364.82-2.096.877-2.956.873-5.241-.003-1.827-.123-4.195 1.965-4.496z" fill="#FEEFC2" />
      <path d="M16.834 14.264l-7.095-3.257c-.815 1.873-2.29 3.308-4.156 4.043-2.16.848-3.605 3.171-2.422 5.54 2.364 4.727 13.673-.05 13.673-6.325z" fill="#FCD53F" />
      <path d="M13.68 12.362c.296.094.46.41.365.707-1.486 4.65-5.818 6.798-9.689 6.997a.562.562 0 11-.057-1.124c3.553-.182 7.372-2.138 8.674-6.216a.562.562 0 01.707-.364z" fill="#F9C23C" />
      <path d="M17.43 19.85l-7.648-8.835h6.753c1.595.08 2.846 1.433 2.846 3.073v5.664c0 .997-.898 1.302-1.95.098z" fill="#FFF478" />
    </svg>
  );
}

function getRatioPreviewStyle(ratio: string): { width: number; height: number } {
  const [rawW, rawH] = ratio.split(':').map((value) => Number(value));
  const width = Number.isFinite(rawW) && rawW > 0 ? rawW : 1;
  const height = Number.isFinite(rawH) && rawH > 0 ? rawH : 1;

  const box = 20;
  if (width >= height) {
    return {
      width: box,
      height: Math.max(8, Math.round((box * height) / width)),
    };
  }

  return {
    width: Math.max(8, Math.round((box * width) / height)),
    height: box,
  };
}

export const ModelParamsControls = memo(({
  imageModels,
  selectedModel,
  selectedResolution,
  selectedAspectRatio,
  aspectRatioOptions,
  onModelChange,
  onResolutionChange,
  onAspectRatioChange,
  showWebSearchToggle = false,
  webSearchEnabled = false,
  onWebSearchToggle,
  webSearchLabel,
  showProviderName = true,
  triggerSize = 'md',
  chipClassName = '',
  modelChipClassName = 'w-auto justify-start',
  paramsChipClassName = 'w-auto justify-start',
  modelPanelAlign = 'center',
  paramsPanelAlign = 'center',
  modelPanelClassName = 'w-[360px] p-2',
  paramsPanelClassName = 'w-[420px] p-3',
}: ModelParamsControlsProps) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const modelTriggerRef = useRef<HTMLDivElement>(null);
  const paramsTriggerRef = useRef<HTMLDivElement>(null);
  const modelPanelRef = useRef<HTMLDivElement>(null);
  const paramsPanelRef = useRef<HTMLDivElement>(null);
  const [openPanel, setOpenPanel] = useState<'model' | 'params' | null>(null);
  const [renderPanel, setRenderPanel] = useState<'model' | 'params' | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [modelPanelAnchor, setModelPanelAnchor] = useState<PanelAnchor | null>(null);
  const [paramsPanelAnchor, setParamsPanelAnchor] = useState<PanelAnchor | null>(null);
  const [modelAnchorBaseWidth, setModelAnchorBaseWidth] = useState<number | null>(null);
  const [paramsAnchorBaseWidth, setParamsAnchorBaseWidth] = useState<number | null>(null);
  const [panelProviderId, setPanelProviderId] = useState(selectedModel.providerId);
  const [missingKeyProviderName, setMissingKeyProviderName] = useState<string | null>(null);
  const apiKeys = useSettingsStore((state) => state.apiKeys);

  const selectedProvider = useMemo(
    () => getModelProvider(selectedModel.providerId),
    [selectedModel.providerId]
  );
  const selectedModelName = useMemo(
    () => selectedModel.displayName.replace(/\s*\([^)]*\)\s*$/u, '').trim() || selectedModel.displayName,
    [selectedModel.displayName]
  );
  const selectedProviderName = selectedProvider.label || selectedProvider.name;
  const providerOptions = useMemo(() => {
    const providerOrder = ['ppio', 'fal', 'kie', 'grsai'];
    const providerIndex = new Map(providerOrder.map((id, index) => [id, index]));
    const uniqueProviderIds = Array.from(new Set(imageModels.map((model) => model.providerId)));
    return uniqueProviderIds
      .map((providerId) => getModelProvider(providerId))
      .sort((left, right) => {
        const leftIndex = providerIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
        const rightIndex = providerIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;
        return leftIndex - rightIndex;
      });
  }, [imageModels]);
  const providerModels = useMemo(
    () => imageModels.filter((model) => model.providerId === panelProviderId),
    [imageModels, panelProviderId]
  );
  const modelGroups = useMemo(() => {
    const grouped = new Map<string, ImageModelDefinition[]>();
    providerModels.forEach((model) => {
      const normalizedName = model.displayName.replace(/\s*\([^)]*\)\s*$/u, '').trim();
      const key = normalizedName.length > 0 ? normalizedName : model.displayName;
      const current = grouped.get(key) ?? [];
      current.push(model);
      grouped.set(key, current);
    });
    return Array.from(grouped.entries())
      .map(([name, models]) => ({ name, models }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [providerModels]);
  const isCompactTrigger = triggerSize === 'sm';
  const modelIconClassName = isCompactTrigger ? 'h-3 w-3 shrink-0' : 'h-4 w-4 shrink-0';
  const paramsIconClassName = isCompactTrigger ? 'h-2.5 w-2.5 shrink-0' : 'h-4 w-4 shrink-0';
  const modelTextClassName = isCompactTrigger
    ? 'min-w-0 truncate text-[10px] font-medium leading-none'
    : 'min-w-0 truncate font-medium';
  const providerTextClassName = isCompactTrigger
    ? 'shrink-0 text-[10px] leading-none text-text-muted/80'
    : 'shrink-0 text-text-muted/80';
  const paramsPrimaryTextClassName = isCompactTrigger
    ? 'truncate text-[10px] leading-none'
    : 'truncate';
  const paramsSecondaryTextClassName = isCompactTrigger
    ? 'text-[10px] leading-none text-text-muted/80'
    : 'text-text-muted/80';

  useEffect(() => {
    const animationDurationMs = 200;
    let enterRaf1: number | null = null;
    let enterRaf2: number | null = null;
    let switchTimer: ReturnType<typeof setTimeout> | null = null;

    const startEnterAnimation = () => {
      enterRaf1 = requestAnimationFrame(() => {
        enterRaf2 = requestAnimationFrame(() => {
          setIsPanelVisible(true);
        });
      });
    };

    if (!openPanel) {
      setIsPanelVisible(false);
      switchTimer = setTimeout(() => setRenderPanel(null), animationDurationMs);
      return () => {
        if (switchTimer) {
          clearTimeout(switchTimer);
        }
        if (enterRaf1) {
          cancelAnimationFrame(enterRaf1);
        }
        if (enterRaf2) {
          cancelAnimationFrame(enterRaf2);
        }
      };
    }

    if (renderPanel && renderPanel !== openPanel) {
      setIsPanelVisible(false);
      switchTimer = setTimeout(() => {
        setRenderPanel(openPanel);
        startEnterAnimation();
      }, animationDurationMs);
      return () => {
        if (switchTimer) {
          clearTimeout(switchTimer);
        }
        if (enterRaf1) {
          cancelAnimationFrame(enterRaf1);
        }
        if (enterRaf2) {
          cancelAnimationFrame(enterRaf2);
        }
      };
    }

    if (!renderPanel) {
      setRenderPanel(openPanel);
    }
    startEnterAnimation();

    return () => {
      if (switchTimer) {
        clearTimeout(switchTimer);
      }
      if (enterRaf1) {
        cancelAnimationFrame(enterRaf1);
      }
      if (enterRaf2) {
        cancelAnimationFrame(enterRaf2);
      }
    };
  }, [openPanel, renderPanel]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as globalThis.Node;
      if (containerRef.current?.contains(target)) {
        return;
      }
      if (modelPanelRef.current?.contains(target)) {
        return;
      }
      if (paramsPanelRef.current?.contains(target)) {
        return;
      }
      setOpenPanel(null);
    };

    document.addEventListener('mousedown', handleOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside, true);
    };
  }, []);

  const getPanelAnchor = (
    triggerElement: HTMLDivElement | null,
    align: 'center' | 'start',
    baseWidth?: number | null
  ): PanelAnchor | null => {
    if (!triggerElement) {
      return null;
    }
    const rect = triggerElement.getBoundingClientRect();
    const anchorWidth = typeof baseWidth === 'number' && baseWidth > 0 ? baseWidth : rect.width;
    return {
      left: align === 'center' ? rect.left + anchorWidth / 2 : rect.left,
      top: rect.top - 8,
    };
  };

  const buildPanelStyle = (
    anchor: PanelAnchor | null,
    align: 'center' | 'start'
  ): React.CSSProperties | undefined => {
    if (!anchor) {
      return undefined;
    }

    const xTransform = align === 'center' ? 'translateX(-50%) ' : '';
    return {
      left: anchor.left,
      top: anchor.top,
      transform: `${xTransform}translateY(-100%)`,
    };
  };

  return (
    <div ref={containerRef} className="flex items-center gap-1">
      <div ref={modelTriggerRef} className="relative flex">
        <UiChipButton
          active={openPanel === 'model'}
          className={`${chipClassName} ${modelChipClassName}`}
          onClick={(event) => {
            event.stopPropagation();
            if (openPanel === 'model') {
              setOpenPanel(null);
              return;
            }
            setPanelProviderId(selectedModel.providerId);
            const triggerWidth = modelTriggerRef.current?.getBoundingClientRect().width ?? null;
            const nextBaseWidth = modelAnchorBaseWidth ?? triggerWidth;
            if (modelAnchorBaseWidth == null && triggerWidth) {
              setModelAnchorBaseWidth(triggerWidth);
            }
            setModelPanelAnchor(getPanelAnchor(modelTriggerRef.current, modelPanelAlign, nextBaseWidth));
            setOpenPanel('model');
          }}
        >
          <NanoBananaIcon className={modelIconClassName} />
          <span className={modelTextClassName}>{selectedModelName}</span>
          {showProviderName && (
            <span className={providerTextClassName}>{selectedProviderName}</span>
          )}
        </UiChipButton>
      </div>

      <div ref={paramsTriggerRef} className="relative flex">
        <UiChipButton
          active={openPanel === 'params'}
          className={`${chipClassName} ${paramsChipClassName}`}
          onClick={(event) => {
            event.stopPropagation();
            if (openPanel === 'params') {
              setOpenPanel(null);
              return;
            }
            const triggerWidth = paramsTriggerRef.current?.getBoundingClientRect().width ?? null;
            const nextBaseWidth = paramsAnchorBaseWidth ?? triggerWidth;
            if (paramsAnchorBaseWidth == null && triggerWidth) {
              setParamsAnchorBaseWidth(triggerWidth);
            }
            setParamsPanelAnchor(getPanelAnchor(paramsTriggerRef.current, paramsPanelAlign, nextBaseWidth));
            setOpenPanel('params');
          }}
        >
          <SlidersHorizontal className={paramsIconClassName} />
          <span className={paramsPrimaryTextClassName}>{selectedAspectRatio.label}</span>
          <span className={paramsSecondaryTextClassName}>· {selectedResolution.label}</span>
        </UiChipButton>
      </div>

      {showWebSearchToggle && (
        <UiChipButton
          active={webSearchEnabled}
          className={`${chipClassName} w-auto justify-center shrink-0`}
          onClick={(event) => {
            event.stopPropagation();
            onWebSearchToggle?.(!webSearchEnabled);
          }}
        >
          <span
            className={`inline-flex h-3 w-3 items-center justify-center rounded-[2px] border ${webSearchEnabled
                ? 'border-accent bg-accent text-white'
                : 'border-text-muted/70 bg-transparent text-transparent'
              }`}
          >
            <Check className="h-2 w-2" strokeWidth={3} />
          </span>
          <span className={paramsPrimaryTextClassName}>
            {webSearchLabel ?? t('modelParams.enableWebSearch')}
          </span>
        </UiChipButton>
      )}

      {typeof document !== 'undefined' && renderPanel === 'model' && createPortal(
        <div
          ref={modelPanelRef}
          className={`fixed z-[80] transition-opacity duration-200 ease-out ${isPanelVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          style={buildPanelStyle(modelPanelAnchor, modelPanelAlign)}
        >
          <UiPanel className={modelPanelClassName}>
            <div className="ui-scrollbar max-h-[340px] space-y-4 overflow-y-auto p-1">
              <section>
                <div className="mb-2 text-xs font-medium text-text-muted">
                  {t('modelParams.provider')}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {providerOptions.map((provider) => {
                    const active = provider.id === panelProviderId;
                    return (
                      <button
                        key={provider.id}
                        className={`h-8 rounded-lg border px-2 text-xs transition-colors ${active
                          ? 'border-accent/50 bg-accent/15 text-text-dark'
                          : 'border-[rgba(255,255,255,0.12)] bg-bg-dark/65 text-text-muted hover:border-[rgba(255,255,255,0.2)]'
                          }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          const providerApiKey = (apiKeys[provider.id] ?? '').trim();
                          if (!providerApiKey) {
                            setOpenPanel(null);
                            setMissingKeyProviderName(provider.label || provider.name);
                            return;
                          }
                          if (provider.id !== panelProviderId) {
                            const firstModel = imageModels.find((model) => model.providerId === provider.id);
                            if (firstModel) {
                              onModelChange(firstModel.id);
                            }
                          }
                          setPanelProviderId(provider.id);
                        }}
                      >
                        {provider.label || provider.name}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-2 text-xs font-medium text-text-muted">
                  {t('modelParams.model')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {modelGroups.map((group) => {
                    const active = group.models.some((model) => model.id === selectedModel.id);
                    const targetModel = group.models.find((model) => model.id === selectedModel.id)
                      ?? group.models[0];
                    return (
                      <button
                        key={group.name}
                        className={`flex h-9 w-[120px] items-center justify-center rounded-lg border px-3 text-center text-xs transition-colors ${active
                          ? 'border-accent/50 bg-accent/15 text-text-dark'
                          : 'border-[rgba(255,255,255,0.12)] bg-bg-dark/65 text-text-muted hover:border-[rgba(255,255,255,0.2)]'
                          }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onModelChange(targetModel.id);
                          setOpenPanel(null);
                        }}
                      >
                        <span className="truncate">{group.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </UiPanel>
        </div>,
        document.body
      )}

      {typeof document !== 'undefined' && renderPanel === 'params' && createPortal(
        <div
          ref={paramsPanelRef}
          className={`fixed z-[80] transition-opacity duration-200 ease-out ${isPanelVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          style={buildPanelStyle(paramsPanelAnchor, paramsPanelAlign)}
        >
          <UiPanel className={paramsPanelClassName}>
            <div>
              <div className="mb-2 text-xs text-text-muted">{t('modelParams.quality')}</div>
              <div className="grid grid-cols-4 gap-1 rounded-xl border border-[rgba(255,255,255,0.1)] bg-bg-dark/65 p-1">
                {selectedModel.resolutions.map((item) => {
                  const active = item.value === selectedResolution.value;
                  return (
                    <button
                      key={item.value}
                      className={`h-8 rounded-lg text-sm transition-colors ${active
                        ? 'bg-surface-dark text-text-dark'
                        : 'text-text-muted hover:bg-bg-dark'
                        }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onResolutionChange(item.value);
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-2 text-xs text-text-muted">{t('modelParams.aspectRatio')}</div>
              <div className="grid grid-cols-5 gap-1 rounded-xl border border-[rgba(255,255,255,0.1)] bg-bg-dark/65 p-1">
                {aspectRatioOptions.map((item) => {
                  const active = item.value === selectedAspectRatio.value;
                  const previewStyle = getRatioPreviewStyle(
                    item.value === AUTO_REQUEST_ASPECT_RATIO ? '1:1' : item.value
                  );

                  return (
                    <button
                      key={item.value}
                      className={`rounded-lg px-1 py-1.5 transition-colors ${active
                        ? 'bg-surface-dark text-text-dark'
                        : 'text-text-muted hover:bg-bg-dark'
                        }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onAspectRatioChange(item.value);
                      }}
                    >
                      <div className="mb-1 flex h-6 items-center justify-center">
                        {item.value === AUTO_REQUEST_ASPECT_RATIO ? (
                          <Zap className="h-3 w-3" strokeWidth={2.4} />
                        ) : (
                          <span
                            className="inline-block rounded-[3px] border border-current/60"
                            style={previewStyle}
                          />
                        )}
                      </div>
                      <div className="text-[10px]">{item.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </UiPanel>
        </div>,
        document.body
      )}

      {typeof document !== 'undefined' && createPortal(
        <UiModal
          isOpen={Boolean(missingKeyProviderName)}
          title={t('modelParams.providerKeyRequiredTitle')}
          onClose={() => setMissingKeyProviderName(null)}
          widthClassName="w-[420px]"
          containerClassName="z-[120]"
          footer={(
            <>
              <UiButton
                variant="muted"
                size="sm"
                onClick={() => setMissingKeyProviderName(null)}
              >
                {t('common.cancel')}
              </UiButton>
              <UiButton
                variant="primary"
                size="sm"
                onClick={() => {
                  setMissingKeyProviderName(null);
                  setOpenPanel(null);
                  openSettingsDialog({ category: 'providers' });
                }}
              >
                {t('modelParams.goConfigure')}
              </UiButton>
            </>
          )}
        >
          <p className="text-sm text-text-muted">
            {t('modelParams.providerKeyRequiredDesc', { provider: missingKeyProviderName ?? '' })}
          </p>
        </UiModal>,
        document.body
      )}
    </div>
  );
});

ModelParamsControls.displayName = 'ModelParamsControls';
