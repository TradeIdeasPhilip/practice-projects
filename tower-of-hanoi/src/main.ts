import "./style.css";

import { initializedArray, sleep } from "phil-lib/misc";
import { getById } from "phil-lib/client-misc";

// https://stackoverflow.com/questions/8910950/solution-of-tower-of-hanoi-when-all-disks-are-not-in-a

type OnPeg = number[];
type OnPegs = [OnPeg, OnPeg, OnPeg];

const animationStyle = document.createElement("style");
document.head.appendChild(animationStyle);

class Drawing {
  #discs: HTMLDivElement[];
  readonly #leftOffsets: number[];
  readonly #bottomOffset = 3;
  static #lastId = 0;
  constructor(readonly count: number) {
    this.#discs = initializedArray(count, (index) => {
      const result = document.createElement("div");
      result.classList.add("disc");
      result.style.width = `${index + 2}em`;
      if (index == 0) {
        result.style.borderColor = "blue";
      }
      result.dataset["id"] = (++Drawing.#lastId).toString();
      document.body.appendChild(result);
      return result;
    });
    this.#leftOffsets = initializedArray(3, (index) => 3 + (3 + count) * index);
  }
  dispose(): void {
    this.#discs.forEach((disc) => disc.remove());
    (this.#discs as any) = undefined;
  }
  /**
   *
   * @param index Which disc.  0 for the smallest.
   * @param x Which peg.  0 for the left, 1 for the middle, 2 for the right.
   * @param y How high.  0 for the bottom disc, 1 for the one right above the bottom one, etc.
   */
  private setPosition(index: number, x: number, y: number) {
    const disc = this.#discs[index];
    const position = this.getPosition(index, x, y);
    disc.style.left = `${position.left}em`;
    disc.style.bottom = `${position.bottom}em`;
  }
  /**
   *
   * @param index Which disc.  0 for the smallest.
   * @param x Which peg.  0 for the left, 1 for the middle, 2 for the right.
   * @param y How high.  0 for the bottom disc, 1 for the one right above the bottom one, etc.
   */
  private getPosition(index: number, x: number, y: number) {
    const left = this.#leftOffsets[x] + (this.#discs.length - index) / 2;
    const bottom = this.#bottomOffset + y;
    return { left, bottom };
  }
  show(positions: OnPegs) {
    positions.forEach((onThisPeg, x) => {
      onThisPeg.forEach((discIndex, fromTop) => {
        this.setPosition(discIndex, x, onThisPeg.length - 1 - fromTop);
      });
    });
  }
  /**
   *
   * @param index Which disc.  0 for the smallest.
   * @param x Which peg.  0 for the left, 1 for the middle, 2 for the right.
   * @param y How high.  0 for the bottom disc, 1 for the one right above the bottom one, etc.
   */
  async move(index: number, fromX: number, fromY: number, toX:number, toY: number) {
    this.setPosition(index, toX, toY);
    const duration = 1500;
    const top = this.count + 4;
    const first = this.getPosition(index, fromX, fromY);
    const second = this.getPosition(index, fromX, top);
    const third = this.getPosition(index, toX, top);
    const last = this.getPosition(index, toX, toY);
    animationStyle.innerHTML = `[data-id="${this.#discs[index].dataset["id"]}"] {animation: disc ${duration}ms linear;}
    @keyframes disc {
      from {left: ${first.left}em; bottom: ${first.bottom}em;}
      40% {left: ${second.left}em; bottom: ${second.bottom}em;}
      60% {left: ${third.left}em; bottom: ${third.bottom}em;}
      to {left: ${last.left}em; bottom: ${last.bottom}em;}
    }`;
    await sleep(duration);
  }
}

class Game {
  #drawing: Drawing;
  #positions: OnPegs;

  constructor(count: number) {
    this.#drawing = new Drawing(count);
    this.#positions = [initializedArray(count, (n) => n), [], []];
    this.#drawing.show(this.#positions);
  }
  dispose(): void {
    this.#drawing.dispose();
    (this.#drawing as any) = undefined;
    (this.#positions as any) = undefined;
  }
  canMove(from: number, to: number): boolean {
    const toMove = this.#positions[from][0];
    if (toMove === undefined) {
      // Can't move a disc from a peg if there are no discs on the pag.
      return false;
    }
    const onTopOf = this.#positions[to][0];
    if (onTopOf === undefined) {
      // You can move any disc to an empty peg.
      return true;
    }
    return toMove < onTopOf;
  }
  allLegalMoves() {
    const result: { to: number; from: number }[] = [];
    for (const to of [0, 1, 2]) {
      for (const from of [0, 1, 2]) {
        if (this.canMove(from, to)) {
          result.push({ from, to });
        }
      }
    }
    return result;
  }
  async move(from: number, to: number) {
    if (!this.canMove(from, to)) {
      throw new Error("invalid move");
    }
    const indexToMove = this.#positions[from].shift();
    if (indexToMove === undefined) {
      throw new Error("wtf");
    }
    const fromY = this.#positions[from].length;
    const toY = this.#positions[to].length;
    this.#positions[to].unshift(indexToMove);
    await this.#drawing.move(indexToMove, from, fromY, to, toY);
  }
  smallestIsOnThisPeg(x: number) {
    return this.#positions[x][0] === 0;
  }
}

let game = new Game(7);

class ButtonInfo {
  readonly #button: HTMLButtonElement;
  readonly #div: HTMLDivElement;
  #action: undefined | (() => Promise<void>);
  constructor(
    description: string,
    private readonly leftIndex: number,
    private readonly rightIndex: number
  ) {
    this.#button = getById(description, HTMLButtonElement);
    this.#button.addEventListener("click", async () => {
      document
        .querySelectorAll("button")
        .forEach((button) => (button.disabled = true));
      await this.#action!();
      updateButtons();
    });
    this.#div = getById(description + "Div", HTMLDivElement);
    this.update();
  }
  update() {
    /**
     * If this button would move the smallest disc, make it bold.
     */
    let makeButtonBold = false;
    if (game.canMove(this.leftIndex, this.rightIndex)) {
      this.#button.disabled = false;
      this.#div.innerText = "> > >";
      this.#action = () => game.move(this.leftIndex, this.rightIndex);
      if (game.smallestIsOnThisPeg(this.leftIndex)) {
        makeButtonBold = true;
      }
    } else if (game.canMove(this.rightIndex, this.leftIndex)) {
      this.#button.disabled = false;
      this.#div.innerText = "< < <";
      this.#action = () => game.move(this.rightIndex, this.leftIndex);
      if (game.smallestIsOnThisPeg(this.rightIndex)) {
        makeButtonBold = true;
      }
    } else {
      this.#button.disabled = true;
      this.#div.innerText = "⨉";
      this.#action = undefined;
    }
    this.#button.classList[makeButtonBold ? "add" : "remove"]("smallest");
  }
}

const buttons = [
  new ButtonInfo("leftCenter", 0, 1),
  new ButtonInfo("centerRight", 1, 2),
  new ButtonInfo("leftRight", 0, 2),
];

function updateButtons() {
  buttons.forEach((buttonInfo) => buttonInfo.update());
}

updateButtons();
