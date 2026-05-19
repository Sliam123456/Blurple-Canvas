import { Slider as MuiSlider, styled } from "@mui/material";
import { useId } from "react";

const Label = styled("label")`
  color: ${({ theme }) => theme.palette.text.secondary};
  display: block;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-block-end: 0.5em;
`;

const SliderBase = styled(MuiSlider)`
  width: calc(100% - 5px);
  &:active {
    scale: 99%;
  }
`;

interface SliderProps extends Omit<
  React.ComponentPropsWithRef<typeof MuiSlider>,
  "value"
> {
  max: number;
  min: number;
  value: number;
  label: React.ReactNode;
  labelProps?: React.ComponentPropsWithRef<typeof Label>;
  onValueChange: (value: number) => void;
}

export default function Slider({
  label,
  labelProps,
  max,
  min,
  value,
  onValueChange,
  ...props
}: SliderProps) {
  const id = useId();
  const handleValueChange = (
    _event: Event,
    value: number | number[],
    _activeThumb: number,
  ) => {
    onValueChange(typeof value === "number" ? value : value[0]);
  };
  return (
    <div>
      <Label htmlFor={id} {...labelProps}>
        {label}
      </Label>
      <SliderBase
        id={id}
        max={max}
        min={min}
        value={value}
        onChange={handleValueChange}
        {...props}
      ></SliderBase>
    </div>
  );
}
