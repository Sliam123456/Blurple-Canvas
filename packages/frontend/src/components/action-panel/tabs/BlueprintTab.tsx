import type { PixelColor } from "@blurple-canvas-web/types";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputLabel,
  styled,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import useLocalStorage from "@/app/settings/useLocalStorage";
import { Button, DynamicButton } from "@/components/button";
import Slider from "@/components/Slider";
import {
  useCanvasContext,
  useSelectedBlueprintContext,
  useSelectedBoundsContext,
} from "@/contexts/";
import { usePalette } from "@/hooks";
import { hexStringToPixelColor, type ViewBounds } from "@/util";
import { GetNearestPixelColor } from "@/util/colorQuantization";
import {
  drawSourceRectToCanvas,
  PreviewCanvas,
} from "../../frames/FramePreview";
import ActionPanelPrimitives from "../primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "./ActionPanelTabBody";

const BlueprintTabBlock = styled(TabPanel)`
  grid-template-rows: auto 1fr;
`;

const CoordsWrapper = styled("div")`
  color: var(--discord-white);
  display: block flex;
  gap: 2rem;
  justify-content: center;
  padding: 0.5rem;
`;

const SettingsContainer = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const BlueprintPreview = styled(PreviewCanvas)`
  height: unset;
`;

interface BlueprintTabProps extends React.ComponentPropsWithRef<
  typeof BlueprintTabBlock
> {
  active?: boolean;
  eventId: number | null;
  setTabsLocked: (locked: boolean) => void;
}

export default function BlueprintTab({
  active = false,
  eventId,
  setTabsLocked,
  ...props
}: BlueprintTabProps) {
  const { canvas } = useCanvasContext();
  const {
    resetSelectedBounds,
    setCanEdit,
    selectedBounds: blueprintBounds,
    setSelectedBounds: setBlueprintBounds,
    setBoundsToCurrentView,
    setShowSelectedBounds,
  } = useSelectedBoundsContext();
  const { setColorMapping } = useSelectedBlueprintContext();
  const { data: palette } = usePalette(eventId ?? undefined);
  const blueprintImageInputRef = useRef<HTMLInputElement | null>(null);
  const drawnBlueprintBoundsRef = useRef<ViewBounds | null>(null);
  const didInitBoundsRef = useRef(false);
  const blueprintPlacedRef = useRef(false);
  const blueprintFromStoredRef = useRef(false);
  const currentSourceRef = useRef("");
  const [opacity, setOpacity] = useState(128);
  const drawnOpacity = useRef(0);
  const drawnBitmap = useRef<ImageDataArray | null>(null);
  const [useAllColors, setUseAllColors] = useState("all");
  const drawnColors = useRef("all");
  const [previewCanvasRef, setPreviewCanvasRef] =
    useState<HTMLCanvasElement | null>(null);
  const [bitmapImage, setBitmapImage] = useState<HTMLImageElement | null>(null);
  const [storedURL, setStoredURL] = useLocalStorage("blueprint/URL");
  const [storedBounds, setStoredBounds] = useLocalStorage("blueprint/bounds");
  const [storedOpacity, setStoredOpacity] =
    useLocalStorage("blueprint/opacity");
  const [storedColors, setStoredColors] = useLocalStorage("blueprint/colors");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const trueBlueprintBounds =
    blueprintPlacedRef.current ?
      drawnBlueprintBoundsRef.current
    : blueprintBounds;
  const possibleColors: PixelColor[] = [];
  for (const color of palette ?? []) {
    if (color.rgba[3] === 255 && (color.global || useAllColors === "all")) {
      possibleColors.push(color.rgba);
    }
  }
  const updateOpacity = () => {
    if (drawnOpacity.current === opacity) {
      return;
    }
    if (!drawnBitmap.current || !trueBlueprintBounds) {
      return;
    }
    const blueprint = document.getElementById("blueprint") as HTMLImageElement;
    const blueprintCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const blueprintContext = blueprintCanvas.getContext("2d");
    blueprintContext?.drawImage(blueprint, 0, 0);
    const blueprintData = blueprintContext?.getImageData(
      trueBlueprintBounds.left,
      trueBlueprintBounds.top,
      trueBlueprintBounds.right - trueBlueprintBounds.left,
      trueBlueprintBounds.bottom - trueBlueprintBounds.top,
    );
    if (!blueprintData) {
      return;
    }
    for (let i = 0; i < drawnBitmap.current.length; i++) {
      if (i % 4 !== 3) {
        blueprintData.data[i] = drawnBitmap.current[i];
        continue;
      }
      blueprintData.data[i] = drawnBitmap.current[i] === 0 ? 0 : opacity;
    }
    blueprintContext?.putImageData(
      blueprintData,
      trueBlueprintBounds.left,
      trueBlueprintBounds.top,
    );
    blueprintCanvas.convertToBlob().then((blob) => {
      if (blueprint.src) {
        URL.revokeObjectURL(blueprint.src);
      }
      blueprint.src = URL.createObjectURL(blob);
      drawnOpacity.current = opacity;
      setStoredOpacity(opacity);
    });
  };
  const updateBlueprint = () => {
    if (!bitmapImage) {
      return;
    }
    let newBlueprintBounds = blueprintBounds;
    if (
      drawnBlueprintBoundsRef.current === blueprintBounds &&
      currentSourceRef.current === bitmapImage.src &&
      drawnColors.current === useAllColors
    ) {
      return;
    } else if (
      !blueprintBounds &&
      currentSourceRef.current === bitmapImage.src &&
      drawnColors.current !== useAllColors
    ) {
      newBlueprintBounds = drawnBlueprintBoundsRef.current;
    }
    if (!newBlueprintBounds) {
      return;
    }
    const bitmapCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const bitmapContext = bitmapCanvas.getContext("2d");
    if (!bitmapContext) {
      return;
    }
    bitmapContext.drawImage(
      bitmapImage,
      newBlueprintBounds.left,
      newBlueprintBounds.top,
      newBlueprintBounds.right - newBlueprintBounds.left,
      newBlueprintBounds.bottom - newBlueprintBounds.top,
    );
    const bitmap = bitmapContext?.getImageData(
      newBlueprintBounds.left,
      newBlueprintBounds.top,
      newBlueprintBounds.right - newBlueprintBounds.left,
      newBlueprintBounds.bottom - newBlueprintBounds.top,
    );
    if (!bitmap) {
      return;
    }
    const bitmapData = bitmap.data;
    const newColorMapping: { [pixel: number]: PixelColor } = {};
    for (let i = 0; i < bitmapData.length; i += 4) {
      if (bitmapData[i + 3] === 0) {
        continue;
      }
      const pixelColor: PixelColor = [
        bitmapData[i],
        bitmapData[i + 1],
        bitmapData[i + 2],
        bitmapData[i + 3],
      ];
      const newColor = GetNearestPixelColor(possibleColors, pixelColor);
      newColorMapping[
        ((i / 4) % bitmap.width) +
          newBlueprintBounds.left +
          (Math.floor(i / 4 / bitmap.width) + newBlueprintBounds.top) *
            canvas.width +
          1
      ] = newColor;
      for (let j = 0; j < 4; j++) {
        bitmapData[i + j] = newColor[j];
      }
    }
    setColorMapping(newColorMapping);
    drawnColors.current = useAllColors;
    setStoredColors(useAllColors);
    bitmapContext.putImageData(
      bitmap,
      newBlueprintBounds.left,
      newBlueprintBounds.top,
    );
    const canvasWrapper = document.getElementById("canvas-image-wrapper");
    const blueprintCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const blueprintContext = blueprintCanvas.getContext("2d");
    blueprintContext?.putImageData(
      bitmap,
      newBlueprintBounds.left,
      newBlueprintBounds.top,
    );
    if (!previewCanvasRef) {
      return;
    }
    drawnBitmap.current = bitmapData;
    const sourceImage = blueprintCanvas.transferToImageBitmap();
    const blueprintPreviewTimeoutId = window.setTimeout(() => {
      drawSourceRectToCanvas(
        previewCanvasRef,
        sourceImage,
        {
          x: newBlueprintBounds.left,
          y: newBlueprintBounds.top,
          width: newBlueprintBounds.right - newBlueprintBounds.left,
          height: newBlueprintBounds.bottom - newBlueprintBounds.top,
        },
        newBlueprintBounds.right - newBlueprintBounds.left,
        newBlueprintBounds.bottom - newBlueprintBounds.top,
      );
    }, 50);
    for (let i = 0; i < bitmapData.length; i += 4) {
      bitmapData[i + 3] = bitmapData[i + 3] === 0 ? 0 : opacity;
    }
    drawnOpacity.current = opacity;
    setStoredOpacity(opacity);
    blueprintContext?.putImageData(
      bitmap,
      newBlueprintBounds.left,
      newBlueprintBounds.top,
    );
    blueprintCanvas.convertToBlob().then((blob) => {
      let blueprint = document.getElementById("blueprint") as HTMLImageElement;
      if (!blueprint) {
        blueprint = new Image();
        blueprint.id = "blueprint";
      } else if (blueprint.src) {
        URL.revokeObjectURL(blueprint.src);
      }
      blueprint.src = URL.createObjectURL(blob);
      canvasWrapper?.appendChild(blueprint);
      drawnBlueprintBoundsRef.current = newBlueprintBounds;
      setStoredBounds([
        newBlueprintBounds.width,
        newBlueprintBounds.height,
        newBlueprintBounds.left,
        newBlueprintBounds.top,
        newBlueprintBounds.right,
        newBlueprintBounds.bottom,
      ]);
      if (blueprintFromStoredRef.current) {
        blueprintPlacedRef.current = true;
        blueprintFromStoredRef.current = false;
      }
      currentSourceRef.current = bitmapImage.src;
      return () => {
        window.clearTimeout(blueprintPreviewTimeoutId);
      };
    });
  };
  useEffect(() => {
    if (blueprintImageInputRef.current || storedURL === undefined) {
      return;
    }
    const newBitmapImage = new Image();
    newBitmapImage.onload = () => {
      if (!didInitBoundsRef.current) {
        didInitBoundsRef.current = true;
        if (storedOpacity) {
          setOpacity(storedOpacity);
        }
        if (storedColors) {
          setUseAllColors(storedColors);
        }
        if (storedBounds) {
          setBlueprintBounds({
            width: storedBounds[0],
            height: storedBounds[1],
            left: storedBounds[2],
            top: storedBounds[3],
            right: storedBounds[4],
            bottom: storedBounds[5],
          });
          blueprintFromStoredRef.current = true;
          setBitmapImage(newBitmapImage);
          return;
        } else {
          setBoundsToCurrentView(0.75);
        }
      } else {
        setBlueprintBounds(drawnBlueprintBoundsRef.current);
      }
      setCanEdit(true);
      setShowSelectedBounds(true);
      setTabsLocked(true);
      blueprintPlacedRef.current = false;
      setBitmapImage(newBitmapImage);
      const storedImage = new OffscreenCanvas(
        newBitmapImage.width,
        newBitmapImage.height,
      );
      const storedImageContext = storedImage.getContext("2d");
      storedImageContext?.drawImage(newBitmapImage, 0, 0);
      storedImage.convertToBlob().then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setStoredURL(reader.result?.toString() ?? null);
        };
        reader.readAsDataURL(blob);
      });
    };
    const BlueprintImageInput: HTMLInputElement =
      document.createElement("input");
    BlueprintImageInput.type = "file";
    BlueprintImageInput.accept = "image/*";
    BlueprintImageInput.onchange = () => {
      if (!BlueprintImageInput.files?.[0]) {
        return;
      }
      blueprintFromStoredRef.current = false;
      if (newBitmapImage.src) {
        URL.revokeObjectURL(newBitmapImage.src);
      }
      newBitmapImage.src = URL.createObjectURL(BlueprintImageInput.files[0]);
    };
    blueprintImageInputRef.current = BlueprintImageInput;
    if (storedURL) {
      newBitmapImage.src = storedURL;
    }
  });
  useEffect(() => {
    const updateBlueprintTimeoutId = window.setTimeout(() => {
      if (!blueprintPlacedRef.current || drawnColors.current !== useAllColors) {
        updateBlueprint();
      }
      updateOpacity();
    }, 50);
    return () => {
      window.clearTimeout(updateBlueprintTimeoutId);
    };
  });
  return (
    <BlueprintTabBlock active={active} {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          {bitmapImage ?
            <div>
              <ActionPanelPrimitives.SectionHeading>
                Blueprint Preview
              </ActionPanelPrimitives.SectionHeading>
              <BlueprintPreview
                ref={setPreviewCanvasRef}
                width={Math.max(
                  1,
                  Math.round(
                    (trueBlueprintBounds?.right ?? 0) -
                      (trueBlueprintBounds?.left ?? 0),
                  ),
                )}
                height={Math.max(
                  1,
                  Math.round(trueBlueprintBounds?.height ?? 0),
                )}
                style={{
                  aspectRatio: `${Math.max(1, (trueBlueprintBounds?.right ?? 0) - (trueBlueprintBounds?.left ?? 0))} / ${Math.max(1, (trueBlueprintBounds?.bottom ?? 0) - (trueBlueprintBounds?.top ?? 0))}`,
                }}
              />
              <ActionPanelPrimitives.SectionHeading>
                Blueprint Coordinates
              </ActionPanelPrimitives.SectionHeading>
              {trueBlueprintBounds ?
                <div>
                  <CoordsWrapper>
                    <code>
                      w:{" "}
                      {(trueBlueprintBounds?.right ?? 0) -
                        (trueBlueprintBounds?.left ?? 0)}
                    </code>
                    <code>
                      h:{" "}
                      {(trueBlueprintBounds?.bottom ?? 0) -
                        (trueBlueprintBounds?.top ?? 0)}
                    </code>
                    <code>x: {trueBlueprintBounds.left}</code>
                    <code>y: {trueBlueprintBounds.top}</code>
                  </CoordsWrapper>
                  <Slider
                    label={<>Opacity:</>}
                    min={1}
                    max={255}
                    value={opacity}
                    onValueChange={(value) => {
                      setOpacity(value);
                    }}
                  />
                </div>
              : <p>No location selected</p>}
            </div>
          : <p>No image uploaded</p>}
          <SettingsContainer>
            <InputLabel>Colors used</InputLabel>
            <ToggleButtonGroup
              color="primary"
              value={useAllColors}
              exclusive
              onChange={(_, value) => {
                if (value) {
                  setUseAllColors(value);
                }
              }}
            >
              <ToggleButton value="main">Main</ToggleButton>
              <ToggleButton value="all">All</ToggleButton>
            </ToggleButtonGroup>
          </SettingsContainer>
        </ActionPanelTabBody>
      </FullWidthScrollView>
      <ActionPanelTabBody>
        {bitmapImage ?
          trueBlueprintBounds ?
            blueprintPlacedRef.current || blueprintFromStoredRef.current ?
              <DynamicButton
                color={null}
                onAction={() => {
                  setBlueprintBounds(trueBlueprintBounds);
                  setCanEdit(true);
                  setShowSelectedBounds(true);
                  setTabsLocked(true);
                  blueprintPlacedRef.current = false;
                }}
              >
                Move Blueprint
              </DynamicButton>
            : <DynamicButton
                color={null}
                onAction={() => {
                  resetSelectedBounds();
                  setCanEdit(false);
                  setShowSelectedBounds(false);
                  setTabsLocked(false);
                  blueprintPlacedRef.current = true;
                }}
              >
                Place Blueprint
              </DynamicButton>

          : <Button disabled>Select a location</Button>
        : <Button disabled>Upload a blueprint</Button>}
        <DynamicButton
          color={null}
          onAction={() => {
            blueprintImageInputRef.current?.click();
          }}
        >
          Upload Image
        </DynamicButton>
        {trueBlueprintBounds ?
          <>
            <DynamicButton
              color={hexStringToPixelColor("#ED4245")}
              onAction={() => setIsDeleteConfirmOpen(true)}
            >
              Delete Blueprint
            </DynamicButton>
            <Dialog
              open={isDeleteConfirmOpen}
              onClose={() => setIsDeleteConfirmOpen(false)}
            >
              <DialogTitle>Delete blueprint?</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  This will permanently delete this blueprint. Are you sure you
                  want to continue?
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <DynamicButton
                  color={null}
                  onAction={() => setIsDeleteConfirmOpen(false)}
                >
                  Cancel
                </DynamicButton>
                <DynamicButton
                  color={hexStringToPixelColor("#ED4245")}
                  onAction={() => {
                    setIsDeleteConfirmOpen(false);
                    resetSelectedBounds();
                    setCanEdit(false);
                    setShowSelectedBounds(false);
                    setTabsLocked(false);
                    blueprintPlacedRef.current = false;
                    didInitBoundsRef.current = false;
                    drawnBlueprintBoundsRef.current = null;
                    currentSourceRef.current = "";
                    drawnOpacity.current = 0;
                    drawnBitmap.current = null;
                    setStoredURL("");
                    setStoredBounds(null);
                    setStoredOpacity(128);
                    setOpacity(0);
                    setBitmapImage(null);
                    const blueprint = document.getElementById(
                      "blueprint",
                    ) as HTMLImageElement;
                    blueprint.parentNode?.removeChild(blueprint);
                  }}
                >
                  Delete
                </DynamicButton>
              </DialogActions>
            </Dialog>
          </>
        : null}
      </ActionPanelTabBody>
    </BlueprintTabBlock>
  );
}
