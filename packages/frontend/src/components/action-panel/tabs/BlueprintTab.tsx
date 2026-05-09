import type { PixelColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useEffect, useRef } from "react";
import { Button, DynamicButton } from "@/components/button";
import {
  useCanvasContext,
  useSelectedBoundsContext,
  useUploadedBlueprintContext,
} from "@/contexts/";
import { usePalette } from "@/hooks";
import type { ViewBounds } from "@/util";
import { GetNearestPixelColor } from "@/util/colorQuantization";
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

let BlueprintImageInput: HTMLInputElement;
let BitmapImage: HTMLImageElement;
let BlueprintBounds: ViewBounds;

interface BlueprintTabProps extends React.ComponentPropsWithRef<
  typeof BlueprintTabBlock
> {
  active?: boolean;
  eventId: number | null;
}

export default function BlueprintTab({
  active = false,
  eventId,
  ...props
}: BlueprintTabProps) {
  const { referenceImage, setReferenceImage, canvasImage, setCanvasImage } =
    useUploadedBlueprintContext();
  const { canvas } = useCanvasContext();
  const {
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
  const didInitBoundsRef = useRef(false);
  const updateBlueprint = () => {
    if (!BitmapImage || !blueprintBounds) {
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
      BitmapImage,
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
      bitmapCanvas.convertToBlob().then((canvasBlob) => {
        setCanvasImage(URL.createObjectURL(canvasBlob));
        const canvasWrapper = document.getElementById("canvas-image-wrapper");
        const blueprintCanvas = new OffscreenCanvas(
          canvas.width,
          canvas.height,
        );
        const blueprintContext = blueprintCanvas.getContext("2d");
        for (let i = 0; i < bitmapData.length; i += 4) {
          bitmapData[i + 3] = bitmapData[i + 3] === 0 ? 0 : 128;
        }
        blueprintContext?.putImageData(
          bitmap,
          BlueprintBounds.left,
          BlueprintBounds.top,
        );
        blueprintCanvas.convertToBlob().then((blueprintBlob) => {
          if (document.getElementById("blueprint")) {
          }
          let blueprint = document.getElementById(
            "blueprint",
          ) as HTMLImageElement;
          if (!blueprint) {
            blueprint = new Image();
            blueprint.id = "blueprint";
          }
          blueprint.src = URL.createObjectURL(blueprintBlob);
          canvasWrapper?.appendChild(blueprint);
        });
      });
    });
  };
  useEffect(() => {
    BlueprintImageInput = document.createElement("input");
    BlueprintImageInput.type = "file";
    BlueprintImageInput.accept = "image/*";
    BlueprintImageInput.onchange = () => {
      if (!BlueprintImageInput.files) {
        return;
      }
      BitmapImage = new Image();
      BitmapImage.onload = () => {
        if (didInitBoundsRef.current) return;
        setBoundsToCurrentView(0.75);
        setCanEdit(true);
        didInitBoundsRef.current = true;
      };
      BitmapImage.src = URL.createObjectURL(BlueprintImageInput.files[0]);
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
              <Heading>Canvas Image</Heading>
              {canvasImage ?
                <img alt="test" src={canvasImage}></img>
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
        {canvasImage ?
          blueprintBounds ?
            <DynamicButton color={null} onAction={() => {}}>
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
