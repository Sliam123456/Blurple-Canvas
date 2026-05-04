"use client";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useState,
} from "react";

interface UploadedBlueprintContextType {
  referenceImage: string | null;
  setReferenceImage: Dispatch<SetStateAction<string | null>>;
  canvasImage: string | null;
  setCanvasImage: Dispatch<SetStateAction<string | null>>;
}

const UploadedBlueprintContext = createContext<UploadedBlueprintContextType>({
  referenceImage: null,
  setReferenceImage: () => {},
  canvasImage: null,
  setCanvasImage: () => {},
});

export const UploadedBlueprintProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [ReferenceImage, setReferenceImage] =
    useState<UploadedBlueprintContextType["referenceImage"]>(null);
  const [CanvasImage, setCanvasImage] =
    useState<UploadedBlueprintContextType["canvasImage"]>(null);

  return (
    <UploadedBlueprintContext.Provider
      value={{
        referenceImage: ReferenceImage,
        setReferenceImage: setReferenceImage,
        canvasImage: CanvasImage,
        setCanvasImage: setCanvasImage,
      }}
    >
      {children}
    </UploadedBlueprintContext.Provider>
  );
};

export const useUploadedBlueprintContext = () => {
  return useContext(UploadedBlueprintContext);
};
