import type { PixelColor } from "@blurple-canvas-web/types";

class ColorNode {
  Children: ColorNode[] = [];
  static readonly LevelMask: number[] = [128, 64, 32, 16, 8, 4, 2, 1];
  ColorIndex: number = 0;

  constructor(
    readonly Level: number,
    readonly SourceColors: PixelColor[],
  ) {}

  GetOctIndex = (chosenColor: PixelColor): number =>
    ((chosenColor[0] & ColorNode.LevelMask[this.Level]) >> (7 - this.Level)) |
    ((chosenColor[1] & ColorNode.LevelMask[this.Level]) >> (6 - this.Level)) |
    ((chosenColor[2] & ColorNode.LevelMask[this.Level]) >> (5 - this.Level));

  static GetDistance = (i: number, j: number): number => (i - j) * (i - j);

  AddColor = (index: number): void => {
    if (this.Level === 7) {
      this.ColorIndex = index;
    } else {
      const NodeIndex: number = this.GetOctIndex(this.SourceColors[index]);
      const SelectedChild: ColorNode =
        this.Children[NodeIndex] ??
        new ColorNode(this.Level + 1, this.SourceColors);
      SelectedChild.AddColor(index);
      this.Children[NodeIndex] = SelectedChild;
    }
  };

  GetNearestColorIndex = (
    TargetColor: PixelColor,
  ): { index: number; distance: number } => {
    let Index: number = 0;
    let Distance: number = 0;
    if (this.Level === 7) {
      Index = this.ColorIndex;
      Distance =
        ColorNode.GetDistance(TargetColor[0], this.SourceColors[Index][0]) +
        ColorNode.GetDistance(TargetColor[1], this.SourceColors[Index][1]) +
        ColorNode.GetDistance(TargetColor[2], this.SourceColors[Index][2]);
    } else {
      const NodeIndex: number = this.GetOctIndex(TargetColor);
      const SelectedChild: ColorNode | null = this.Children[NodeIndex];
      if (!SelectedChild) {
        let MinDistance: number = Number.MAX_VALUE;
        for (const Child of this.Children) {
          if (Child) {
            const { index: ChildIndex, distance: ChildDistance } =
              Child.GetNearestColorIndex(TargetColor);
            if (ChildDistance < MinDistance) {
              MinDistance = ChildDistance;
              Index = ChildIndex;
            }
          }
        }
        Distance = MinDistance;
      } else {
        ({ index: Index, distance: Distance } =
          SelectedChild.GetNearestColorIndex(TargetColor));
      }
    }
    return { index: Index, distance: Distance };
  };
}

class ColorFinder {
  readonly Root: ColorNode;

  constructor(Colors: PixelColor[]) {
    this.Root = new ColorNode(0, Colors);
    for (let i = 0; i < Colors.length; i++) {
      this.Root.AddColor(i);
    }
  }

  GetNearestColorIndex = (TargetColor: PixelColor): number =>
    this.Root.GetNearestColorIndex(TargetColor).index;
}

export function GetNearestPixelColor(
  SourceColors: PixelColor[],
  ImageColor: PixelColor,
): PixelColor {
  const Finder: ColorFinder = new ColorFinder(SourceColors);
  return SourceColors[Finder.GetNearestColorIndex(ImageColor)];
}
