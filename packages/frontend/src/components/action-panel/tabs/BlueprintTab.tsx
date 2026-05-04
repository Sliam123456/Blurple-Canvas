import type { PixelColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useEffect } from "react";
import { DynamicButton } from "@/components/button";
import { useUploadedImageContext } from "@/contexts/";
import { usePalette } from "@/hooks";
import { GetNearestPixelColor } from "@/util/canvasifier";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "./ActionPanelTabBody";

const BlueprintTabBlock = styled(TabPanel)`
  grid-template-rows: auto 1fr;
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
  const { image: uploadedImage, setImage: setUploadedImage } =
    useUploadedImageContext();
  const { data: palette } = usePalette(eventId ?? undefined);
  const possibleColors: PixelColor[] = [];
  for (const color of palette ?? []) {
    if (color.global && color.rgba[3] === 255) {
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
      const bitmapCanvas = document.createElement("canvas");
      const bitmapContext = bitmapCanvas.getContext("2d");
      if (!bitmapContext) {
        return;
      }
      const canvasImage = new Image();
      canvasImage.onload = () => {
        //TODO: Allow user-provided width and height
        const width = 100;
        const height = 100;
        bitmapContext.drawImage(canvasImage, 0, 0, width, height);
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
          const newColor: PixelColor = GetNearestPixelColor(
            possibleColors,
            pixelColor,
          );
          for (let j = 0; j < 4; j++) {
            bitmapData[i + j] = newColor[j];
          }
        }
        bitmapContext.putImageData(bitmap, 0, 0);
        bitmapCanvas.toBlob((blob) => {
          if (!blob) {
            return;
          }
          setUploadedImage(URL.createObjectURL(blob));
        });
      };
      canvasImage.src = URL.createObjectURL(BlueprintImageInput.files[0]);
    };
  });
  return (
    <BlueprintTabBlock active={active} {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          {uploadedImage ?
            <img alt="test" src={uploadedImage}></img>
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
