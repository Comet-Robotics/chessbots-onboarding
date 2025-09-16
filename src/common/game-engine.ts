import { GameFinishedReason } from "./game-end-reasons.ts";
import { Placement } from "./game-types.ts";                // Incorrect import reference fixed
import { PieceType } from "./game-types.ts";                // Missing import fixed

export class GameEngine {
    private board: PieceType[];
    private currentTurn: PieceType;

    constructor(startingPiece: PieceType) {
        this.board = Array(9).fill(PieceType.BLANK);
        this.currentTurn = startingPiece;
    }

    place(placement: Placement): boolean {
        if (this.board[placement.square] == PieceType.BLANK) {
            this.board[placement.square] = placement.pieceType;
            this.currentTurn = GameEngine.oppositePiece(this.currentTurn);
            return true;
        } else {
            return false;
        }
    }

    /**
     * Returns if a square has a piece on it.
     * @param square - The square of the board to check.
     * @returns true if the square has a piece on it.
     */
    hasPiece(square: number) {
        return this.board[square] !== PieceType.BLANK;
    }

    static oppositePiece(pieceType: PieceType): PieceType {
        if (pieceType == PieceType.X) {
            return PieceType.O;
        } else {
            return PieceType.X;
        }
    }

    /**
     * Returns if the input piece has a win in the specified row.
     * @param pieceType - The piece type to check the wins for.
     * @param offset - The row offset (determines which row to check).
     * @returns true if the rows has a win
     */
    isRowWin(pieceType: PieceType, offset: number): boolean {
        const first = this.board[offset*3] == pieceType;
        const second= this.board[1+(offset*3)] == pieceType;
        const third = this.board[2+(offset*3)] == pieceType;
        return first && second && third;
    }

    /**
     * Returns if the input piece has a win in the specified column.
     * @param pieceType - The piece type to check the wins for.
     * @param offset - The column offset (determines which column to check).
     * @returns true if the columns has a win
     */
    isColumnWin(pieceType: PieceType, offset: number): boolean {
        const first = this.board[offset] == pieceType;
        const second= this.board[3+(offset)] == pieceType;
        const third = this.board[6+(offset)] == pieceType;
        return first && second && third;
    }

    isDiagonalWin(pieceType: PieceType): boolean {
        const first = this.board[0] == pieceType;
        const second= this.board[4] == pieceType;
        const third = this.board[8] == pieceType;
        return first && second && third;
    }

    isAntiDiagonalWin(pieceType: PieceType): boolean {
        const first = this.board[2] == pieceType;
        const second= this.board[4] == pieceType;
        const third = this.board[6] == pieceType;
        return first && second && third;
    }

    isXWin(): boolean {
        let rowWin = false;
        let columnWin = false;
        let diagonalWin = false;
        for (let i = 0; i < 3; i++) {
            if (this.isRowWin(PieceType.X, i)) {
                rowWin = true;
            }
        }
        for (let i = 0; i < 3; i++) {
            if (this.isColumnWin(PieceType.X, i)) {
                columnWin = true;
            }
        }
        if (this.isDiagonalWin(PieceType.X) || this.isAntiDiagonalWin(PieceType.X)) {
            diagonalWin = true;
        }
        return rowWin || columnWin || diagonalWin;
    }

    isOWin(): boolean {
        let rowWin = false;
        let columnWin = false;
        let diagonalWin = false;
        for (let i = 0; i < 3; i++) {
            if (this.isRowWin(PieceType.O, i)) {
                rowWin = true;
            }
        }
        for (let i = 0; i < 3; i++) {
            if (this.isColumnWin(PieceType.O, i)) {
                columnWin = true;
            }
        }
        if (this.isDiagonalWin(PieceType.O) || this.isAntiDiagonalWin(PieceType.O)) {
            diagonalWin = true;
        }
        return rowWin || columnWin || diagonalWin;
    }

    isTie(): boolean {
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i] == PieceType.BLANK) {
                return false;
            }
        }
        return true;
    }

    getGameFinishedReason(): GameFinishedReason | undefined {
        if (this.isXWin()) {
            return GameFinishedReason.X_WON;
        } else if (this.isOWin()) {
            return GameFinishedReason.O_WON;
        } else if (this.isTie()) {
            return GameFinishedReason.TIE;
        }
        return undefined;
    }

    /**
     * Returns true if `getGameFinishedReason` does not return undefined.
     */
    isGameFinished(): boolean {
        return this.getGameFinishedReason() !== undefined;
    }
}
