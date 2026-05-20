"use client";
import type { PixelColor } from "@blurple-canvas-web/types";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useState,
} from "react";

interface SelectedBlueprintContextType {
  colorMapping: { [pixel: number]: PixelColor };
  setColorMapping: Dispatch<SetStateAction<{ [pixel: number]: PixelColor }>>;
}

const SelectedBlueprintContext = createContext<SelectedBlueprintContextType>({
  colorMapping: {},
  setColorMapping: () => {},
});

export const SelectedBlueprintProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [ColorMapping, SetColorMapping] = useState<
    SelectedBlueprintContextType["colorMapping"]
  >({});

  return (
    <SelectedBlueprintContext.Provider
      value={{
        colorMapping: ColorMapping,
        setColorMapping: SetColorMapping,
      }}
    >
      {children}
    </SelectedBlueprintContext.Provider>
  );
};

export const useSelectedBlueprintContext = () => {
  return useContext(SelectedBlueprintContext);
};
