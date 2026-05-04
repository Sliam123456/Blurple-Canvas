import type { PixelColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useEffect } from "react";
import { DynamicButton } from "@/components/button";
import { useUploadedBlueprintContext } from "@/contexts/";
import { usePalette } from "@/hooks";
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
  const { data: palette } = usePalette(eventId ?? undefined);
  const possibleColors: PixelColor[] = [];
  for (const color of palette ?? []) {
    //TODO: User toggling of global only/all colors
    if (color.rgba[3] === 255) {
      possibleColors.push(color.rgba);
    }
  }
  useEffect(() => {
    BlueprintImageInput = document.createElement("input");
    BlueprintImageInput.type = "file";
    BlueprintImageInput.accept = "image/*";
    BlueprintImageInput.onchange = () => {
      if (BlueprintImageInput.files == null) {
        return;
      }
      //Convert file to bitmap data in RGBA format
      //TODO: Allow user-provided width and height
      const width = 150;
      const height = 150;
      const bitmapCanvas = new OffscreenCanvas(width, height);
      const bitmapContext = bitmapCanvas.getContext("2d");
      if (!bitmapContext) {
        return;
      }
      const bitmapImage = new Image();
      bitmapImage.onload = () => {
        bitmapContext.drawImage(bitmapImage, 0, 0, width, height);
        const bitmap = bitmapContext?.getImageData(0, 0, width, height);
        if (!bitmap) {
          return;
        }
        const bitmapData = bitmap.data;
        for (let i = 0; i < bitmapData.length; i += 4) {
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
          bitmapContext.putImageData(bitmap, 0, 0);
          bitmapCanvas.convertToBlob().then((canvasBlob) => {
            setCanvasImage(URL.createObjectURL(canvasBlob));
            //TODO: Move this to the canvas view file
            const canvas = document.getElementById("canvas-image-wrapper");
            const blueprintCanvas = new OffscreenCanvas(700, 700);
            const blueprintContext = blueprintCanvas.getContext("2d");
            for (let i = 0; i < bitmapData.length; i += 4) {
              bitmapData[i + 3] = 128;
            }
            blueprintContext?.putImageData(bitmap, 0, 0);
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
              canvas?.appendChild(blueprint);
            });
          });
        });
      };
      bitmapImage.src = URL.createObjectURL(BlueprintImageInput.files[0]);
    };
  });
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
              <CoordsWrapper>
                <code>w: 150</code>
                <code>h: 150</code>
                <code>x: 1</code>
                <code>y: 1</code>
              </CoordsWrapper>
            </div>
          : <p>No image uploaded</p>}
        </ActionPanelTabBody>
      </FullWidthScrollView>
      <ActionPanelTabBody>
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
