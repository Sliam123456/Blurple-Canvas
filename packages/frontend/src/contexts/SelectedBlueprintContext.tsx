"use client";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useState,
} from "react";

interface SelectedBlueprintContextType {
  referenceImage: string | null;
  setReferenceImage: Dispatch<SetStateAction<string | null>>;
  bitmapImage: HTMLImageElement | null;
  setBitmapImage: Dispatch<SetStateAction<HTMLImageElement | null>>;
}

const SelectedBlueprintContext = createContext<SelectedBlueprintContextType>({
  referenceImage: null,
  setReferenceImage: () => {},
  bitmapImage: null,
  setBitmapImage: () => {},
});

export const SelectedBlueprintProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [ReferenceImage, setReferenceImage] =
    useState<SelectedBlueprintContextType["referenceImage"]>(null);
  const [BitmapImage, setBitmapImage] =
    useState<SelectedBlueprintContextType["bitmapImage"]>(null);

  return (
    <SelectedBlueprintContext.Provider
      value={{
        referenceImage: ReferenceImage,
        setReferenceImage: setReferenceImage,
        bitmapImage: BitmapImage,
        setBitmapImage: setBitmapImage,
      }}
    >
      {children}
    </SelectedBlueprintContext.Provider>
  );
};

export const useSelectedBlueprintContext = () => {
  return useContext(SelectedBlueprintContext);
};
