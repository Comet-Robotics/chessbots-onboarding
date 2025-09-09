import { GameEngine } from "../../common/game-engine.ts";
import {
    Message,
    SendMessage,
    GameInterruptedMessage,
    GameFinishedMessage,
} from "../../common/message/messages.ts";
import { SocketManager } from "./socket-manager.ts";
import { ClientManager } from "./client-manager.ts";
import { ClientType } from "../../common/client-types.ts"
import {
    GameEndReason,
    GameEndReason as GameInterruptedReason,
} from "../../common/game-end-reasons.ts"
import { PieceType } from "../../common/game-types.ts";
import { PlacementMessage, GameStartedMessage } from "../../common/message/messages.ts";
export class GameManager {
    protected gameInterruptedReason: GameInterruptedReason | undefined =
        undefined;

    constructor(
        public game: GameEngine,
        protected socketManager: SocketManager,
        /**
         * The pieceType the host is playing.
         */
        public hostPiece: PieceType,
        protected clientManager: ClientManager,
    ) {
        // Notify other client the game has started
        clientManager.sendToClient(new GameStartedMessage());
    }

    public isGameEnded(): boolean {
        return (
            this.gameInterruptedReason !== undefined ||
            this.game.isGameFinished()
        );
    }

    public getGameEndReason(): GameEndReason | undefined {
        return this.gameInterruptedReason ?? this.game.getGameFinishedReason();
    }

    /**
     * A method which is invoked whenever a game first connects.
     * Should respond with the what piece the host is playing, the game object, and whether the game is finished.
     */
    public getGameState(): object {
        const hostPiece: PieceType = this.hostPiece;
        return {
            hostPiece,
            game: this.game,
            gameEndReason: this.getGameEndReason(),
        };
    }

    public getBoardState(): object {
        return {
            game: this.game
        };
    }

    public handleMessage(message: Message, id: string): void {
        const clientType = this.clientManager.getClientType(id);
        let sendToPlayer: SendMessage;
        let sendToOpponent: SendMessage;
        if (clientType === ClientType.HOST) {
            sendToPlayer = this.clientManager.sendToHost.bind(
                this.clientManager,
            );
            sendToOpponent = this.clientManager.sendToClient.bind(
                this.clientManager,
            );
        } else {
            sendToPlayer = this.clientManager.sendToClient.bind(
                this.clientManager,
            );
            sendToOpponent = this.clientManager.sendToHost.bind(
                this.clientManager,
            );
        }

        if (message instanceof PlacementMessage) {
            if (this.game.getGameFinishedReason()) {
              console.log("Not sending placement message because game is finished.", message.toJson())
              return;
            }
            if (this.game.place(message.placement)) {
                sendToOpponent(message);
                const gameFinishedReason = this.game.getGameFinishedReason();
                if (gameFinishedReason) {
                    const gameFinishedMessage = new GameFinishedMessage(gameFinishedReason);
                    sendToPlayer(gameFinishedMessage);
                    sendToOpponent(gameFinishedMessage);
                }
            }
        } else if (message instanceof GameInterruptedMessage) {
            this.gameInterruptedReason = message.reason;
            // propagate back to both sockets
            sendToPlayer(message);
            sendToOpponent(message);
        }
    }
}
