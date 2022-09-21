import "./style.css";

import { initializedArray } from "phil-lib/misc";
import { getById } from "phil-lib/client-misc";

type OnPeg = number[];
type OnPegs = [OnPeg, OnPeg, OnPeg];

class Drawing {
  #discs: HTMLDivElement[];
  readonly #leftOffsets: number[];
  readonly #bottomOffset = 3;
  constructor(readonly count: number) {
    this.#discs = initializedArray(count, (index) => {
      const result = document.createElement("div");
      result.classList.add("disc");
      result.style.width = `${index + 2}em`;
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
  async move(index: number, x: number, y: number) {
    // TODO add an animation
    this.setPosition(index, x, y);
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
    const y = this.#positions[to].length;
    this.#positions[to].unshift(indexToMove);
    await this.#drawing.move(indexToMove, to, y);
  }
}

let game = new Game(7);

const buttonsDiv = getById("buttons", HTMLDivElement);

function drawButtons() {
  buttonsDiv.innerText = "";
  game.allLegalMoves().forEach(({ to, from }) => {
    const button = document.createElement("button");
    button.innerText = `${from} » ${to}`;
    button.addEventListener("click", async () => {
      buttonsDiv.querySelectorAll("button").forEach((b) => (b.disabled = true));
      await game.move(from, to);
      drawButtons();
    });
    buttonsDiv.appendChild(button);
  });
}

drawButtons();
