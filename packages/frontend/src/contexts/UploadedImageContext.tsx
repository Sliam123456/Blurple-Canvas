"use client";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useState,
} from "react";

interface UploadedImageContextType {
  image: string | null;
  setImage: Dispatch<SetStateAction<string | null>>;
}

const UploadedImageContext = createContext<UploadedImageContextType>({
  image: null,
  setImage: () => {},
});

export const UploadedImageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [UploadedImage, setUploadedImage] =
    useState<UploadedImageContextType["image"]>(null);

  return (
    <UploadedImageContext.Provider
      value={{
        image: UploadedImage,
        setImage: setUploadedImage,
      }}
    >
      {children}
    </UploadedImageContext.Provider>
  );
};

export const useUploadedImageContext = () => {
  return useContext(UploadedImageContext);
};
