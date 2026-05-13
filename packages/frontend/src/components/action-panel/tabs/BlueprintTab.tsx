import type { PixelColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Button, DynamicButton } from "@/components/button";
import { useCanvasContext, useSelectedBoundsContext } from "@/contexts/";
import { usePalette } from "@/hooks";
import type { ViewBounds } from "@/util";
import { GetNearestPixelColor } from "@/util/colorQuantization";
import {
  drawSourceRectToCanvas,
  PreviewCanvas,
} from "../../frames/FramePreview";
import { Heading } from "../ActionPanel";
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
    clearSelectedBounds,
    setCanEdit,
    selectedBounds: blueprintBounds,
    setSelectedBounds: setBlueprintBounds,
    setBoundsToCurrentView,
  } = useSelectedBoundsContext();
  const { data: palette } = usePalette(eventId ?? undefined);
  const possibleColors: PixelColor[] = [];
  for (const color of palette ?? []) {
    //TODO: User toggling of global only/all colors
    if (color.rgba[3] === 255) {
      possibleColors.push(color.rgba);
    }
  }
  const blueprintImageInputRef = useRef<HTMLInputElement | null>(null);
  const drawnBlueprintBoundsRef = useRef<ViewBounds | null>(null);
  const didInitBoundsRef = useRef(false);
  const blueprintPlacedRef = useRef(false);
  const currentSourceRef = useRef("");
  const [previewCanvasRef, setPreviewCanvasRef] =
    useState<HTMLCanvasElement | null>(null);
  const [bitmapImage, setBitmapImage] = useState<HTMLImageElement | null>(null);
  const updateBlueprint = () => {
    if (!bitmapImage || !blueprintBounds) {
      return;
    }
    if (
      drawnBlueprintBoundsRef.current === blueprintBounds &&
      currentSourceRef.current == bitmapImage.src
    ) {
      return;
    }
    const bitmapCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const bitmapContext = bitmapCanvas.getContext("2d");
    if (!bitmapContext) {
      return;
    }
    bitmapContext.drawImage(
      bitmapImage,
      blueprintBounds.left,
      blueprintBounds.top,
      blueprintBounds.width,
      blueprintBounds.height,
    );
    const bitmap = bitmapContext?.getImageData(
      blueprintBounds.left,
      blueprintBounds.top,
      blueprintBounds.width,
      blueprintBounds.height,
    );
    if (!bitmap) {
      return;
    }
    const bitmapData = bitmap.data;
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
      for (let j = 0; j < 4; j++) {
        bitmapData[i + j] = newColor[j];
      }
    }
    bitmapContext.putImageData(
      bitmap,
      blueprintBounds.left,
      blueprintBounds.top,
    );
    const canvasWrapper = document.getElementById("canvas-image-wrapper");
    const blueprintCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const blueprintContext = blueprintCanvas.getContext("2d");
    blueprintContext?.putImageData(
      bitmap,
      blueprintBounds.left,
      blueprintBounds.top,
    );
    if (!previewCanvasRef) {
      return;
    }
    const sourceImage = blueprintCanvas;
    const blueprintPreviewTimeoutId = window.setTimeout(() => {
      drawSourceRectToCanvas(
        previewCanvasRef,
        sourceImage,
        {
          x: blueprintBounds.left,
          y: blueprintBounds.top,
          width: blueprintBounds.width,
          height: blueprintBounds.height,
        },
        blueprintBounds.width,
        blueprintBounds.height,
      );
    }, 50);
    for (let i = 0; i < bitmapData.length; i += 4) {
      bitmapData[i + 3] = bitmapData[i + 3] === 0 ? 0 : 128;
    }
    blueprintContext?.putImageData(
      bitmap,
      blueprintBounds.left,
      blueprintBounds.top,
    );
    blueprintCanvas.convertToBlob().then((blob) => {
      let blueprint = document.getElementById("blueprint") as HTMLImageElement;
      if (!blueprint) {
        blueprint = new Image();
        blueprint.id = "blueprint";
      }
      blueprint.src = URL.createObjectURL(blob);
      canvasWrapper?.appendChild(blueprint);
      drawnBlueprintBoundsRef.current = blueprintBounds;
      currentSourceRef.current = bitmapImage.src;
      return () => {
        window.clearTimeout(blueprintPreviewTimeoutId);
      };
    });
  };
  useEffect(() => {
    if (blueprintImageInputRef.current) {
      return;
    }
    let BlueprintImageInput: HTMLInputElement = document.createElement("input");
    BlueprintImageInput.type = "file";
    BlueprintImageInput.accept = "image/*";
    BlueprintImageInput.onchange = () => {
      if (!BlueprintImageInput.files?.[0]) {
        return;
      }
      const newBitmapImage = new Image();
      newBitmapImage.onload = () => {
        if (!didInitBoundsRef.current) {
          setBoundsToCurrentView(0.75);
          setCanEdit(true);
          setTabsLocked(true);
          didInitBoundsRef.current = true;
          blueprintPlacedRef.current = false;
        }
        setBitmapImage(newBitmapImage);
      };
      newBitmapImage.src = URL.createObjectURL(BlueprintImageInput.files[0]);
    };
    blueprintImageInputRef.current = BlueprintImageInput;
  });
  useEffect(() => {
    const updateBlueprintTimeoutId = window.setTimeout(() => {
      if (!blueprintPlacedRef.current) {
        updateBlueprint();
      }
    }, 50);
    return () => {
      window.clearTimeout(updateBlueprintTimeoutId);
    };
  });
  const trueBlueprintBounds =
    blueprintPlacedRef.current ?
      drawnBlueprintBoundsRef.current
    : blueprintBounds;
  return (
    <BlueprintTabBlock active={active} {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          {bitmapImage ?
            <div>
              <Heading>Blueprint Preview</Heading>
              <BlueprintPreview
                ref={setPreviewCanvasRef}
                width={Math.max(1, Math.round(trueBlueprintBounds?.width ?? 0))}
                height={Math.max(
                  1,
                  Math.round(trueBlueprintBounds?.height ?? 0),
                )}
                style={{
                  aspectRatio: `${Math.max(1, trueBlueprintBounds?.width ?? 0)} / ${Math.max(1, trueBlueprintBounds?.height ?? 0)}`,
                }}
              />
              <Heading>Blueprint Coordinates</Heading>
              {trueBlueprintBounds ?
                <div>
                  <CoordsWrapper>
                    <code>w: {trueBlueprintBounds.width}</code>
                    <code>h: {trueBlueprintBounds.height}</code>
                    <code>x: {trueBlueprintBounds.left}</code>
                    <code>y: {trueBlueprintBounds.top}</code>
                  </CoordsWrapper>
                </div>
              : <p>No location selected</p>}
            </div>
          : <p>No image uploaded</p>}
        </ActionPanelTabBody>
      </FullWidthScrollView>
      <ActionPanelTabBody>
        {bitmapImage ?
          trueBlueprintBounds ?
            blueprintPlacedRef.current ?
              <DynamicButton
                color={null}
                onAction={() => {
                  setBlueprintBounds(trueBlueprintBounds);
                  setCanEdit(true);
                  setTabsLocked(true);
                  blueprintPlacedRef.current = false;
                }}
              >
                Move Blueprint
              </DynamicButton>
            : <DynamicButton
                color={null}
                onAction={() => {
                  clearSelectedBounds();
                  setCanEdit(false);
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
      </ActionPanelTabBody>
    </BlueprintTabBlock>
  );
}
