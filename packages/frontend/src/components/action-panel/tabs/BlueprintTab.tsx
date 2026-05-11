import type { PixelColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useEffect, useRef } from "react";
import { Button, DynamicButton } from "@/components/button";
import {
  useCanvasContext,
  useSelectedBlueprintContext,
  useSelectedBoundsContext,
} from "@/contexts/";
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

let BlueprintImageInput: HTMLInputElement;
let BlueprintBounds: ViewBounds;

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
  const { referenceImage, setReferenceImage, bitmapImage, setBitmapImage } =
    useSelectedBlueprintContext();
  const { canvas } = useCanvasContext();
  const {
    clearSelectedBounds,
    setCanEdit,
    selectedBounds: blueprintBounds,
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
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const didInitBoundsRef = useRef(false);
  const updateBlueprint = () => {
    if (!bitmapImage || !blueprintBounds) {
      return;
    }
    if (BlueprintBounds === blueprintBounds) {
      return;
    }
    BlueprintBounds = blueprintBounds;
    const bitmapCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const bitmapContext = bitmapCanvas.getContext("2d");
    if (!bitmapContext) {
      return;
    }
    bitmapContext.drawImage(
      bitmapImage,
      BlueprintBounds.left,
      BlueprintBounds.top,
      BlueprintBounds.width,
      BlueprintBounds.height,
    );
    const bitmap = bitmapContext?.getImageData(
      BlueprintBounds.left,
      BlueprintBounds.top,
      BlueprintBounds.width,
      BlueprintBounds.height,
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
    bitmapCanvas.convertToBlob().then((referenceBlob) => {
      setReferenceImage(URL.createObjectURL(referenceBlob));
      bitmapContext.putImageData(
        bitmap,
        BlueprintBounds.left,
        BlueprintBounds.top,
      );
      const canvasWrapper = document.getElementById("canvas-image-wrapper");
      const blueprintCanvas = new OffscreenCanvas(canvas.width, canvas.height);
      const blueprintContext = blueprintCanvas.getContext("2d");
      blueprintContext?.putImageData(
        bitmap,
        BlueprintBounds.left,
        BlueprintBounds.top,
      );
      const blueprintPreview = previewCanvasRef.current;
      if (!blueprintPreview) {
        return;
      }
      const sourceImage = blueprintCanvas;
      const blueprintPreviewTimeoutId = window.setTimeout(() => {
        if (blueprintBounds.width === 0 || blueprintBounds.height === 0) {
          return;
        }
        drawSourceRectToCanvas(
          blueprintPreview,
          sourceImage,
          {
            x: BlueprintBounds.left,
            y: BlueprintBounds.top,
            width: BlueprintBounds.width,
            height: BlueprintBounds.height,
          },
          BlueprintBounds.width,
          BlueprintBounds.height,
        );
      }, 50);
      for (let i = 0; i < bitmapData.length; i += 4) {
        bitmapData[i + 3] = bitmapData[i + 3] === 0 ? 0 : 128;
      }
      blueprintContext?.putImageData(
        bitmap,
        BlueprintBounds.left,
        BlueprintBounds.top,
      );
      blueprintCanvas.convertToBlob().then((blueprintBlob) => {
        let blueprint = document.getElementById(
          "blueprint",
        ) as HTMLImageElement;
        if (!blueprint) {
          blueprint = new Image();
          blueprint.id = "blueprint";
        }
        blueprint.src = URL.createObjectURL(blueprintBlob);
        canvasWrapper?.appendChild(blueprint);
        return () => window.clearTimeout(blueprintPreviewTimeoutId);
      });
    });
  };
  useEffect(() => {
    if (bitmapImage) {
      if (didInitBoundsRef.current) {
        return;
      }
      setBoundsToCurrentView(0.75); //TODO: set to current blueprint
      setCanEdit(true);
      setTabsLocked(true);
      didInitBoundsRef.current = true;
      return;
    }
    BlueprintImageInput = document.createElement("input");
    BlueprintImageInput.type = "file";
    BlueprintImageInput.accept = "image/*";
    BlueprintImageInput.onchange = () => {
      if (!BlueprintImageInput.files) {
        return;
      }
      const newBitmapImage = new Image();
      newBitmapImage.onload = () => {
        if (didInitBoundsRef.current) {
          return;
        }
        setBoundsToCurrentView(0.75);
        setCanEdit(true);
        setTabsLocked(true);
        didInitBoundsRef.current = true;
      };
      newBitmapImage.src = URL.createObjectURL(BlueprintImageInput.files[0]);
      setBitmapImage(newBitmapImage);
    };
  });
  updateBlueprint();
  return (
    <BlueprintTabBlock active={active} {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          {referenceImage ?
            <div>
              <Heading>Reference Image</Heading>
              <img alt="test" src={referenceImage}></img>
              <Heading>Blueprint Preview</Heading>
              {bitmapImage ?
                <BlueprintPreview
                  ref={previewCanvasRef}
                  width={Math.max(1, Math.round(BlueprintBounds.width))}
                  height={Math.max(1, Math.round(BlueprintBounds.height))}
                  style={{
                    aspectRatio: `${Math.max(1, BlueprintBounds.width)} / ${Math.max(1, BlueprintBounds.height)}`,
                  }}
                />
              : <p>Loading...</p>}
              <Heading>Blueprint Coordinates</Heading>
              {blueprintBounds ?
                <div>
                  <CoordsWrapper>
                    <code>w: {blueprintBounds.width}</code>
                    <code>h: {blueprintBounds.height}</code>
                    <code>x: {blueprintBounds.left}</code>
                    <code>y: {blueprintBounds.top}</code>
                  </CoordsWrapper>
                </div>
              : <p>No location selected</p>}
            </div>
          : <p>No image uploaded</p>}
        </ActionPanelTabBody>
      </FullWidthScrollView>
      <ActionPanelTabBody>
        {bitmapImage ?
          blueprintBounds ?
            <DynamicButton
              color={null}
              onAction={() => {
                clearSelectedBounds();
                setTabsLocked(false);
              }}
            >
              Place Blueprint
            </DynamicButton>
          : <Button disabled>Select a location</Button>
        : <Button disabled>Upload a blueprint</Button>}
        <DynamicButton
          color={null}
          onAction={() => {
            BlueprintImageInput.click();
          }}
        >
          Upload Image
        </DynamicButton>
      </ActionPanelTabBody>
    </BlueprintTabBlock>
  );
}
