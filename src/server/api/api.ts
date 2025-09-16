import { WebsocketRequestHandler } from "express-ws";
import { Router } from "express";
import { parseMessage } from "../../common/message/parse-message.ts";
import {
    RegisterWebsocketMessage,
    GameInterruptedMessage,
    PlacementMessage,
    GameStartedMessage                                      // Missing import fixed
} from "../../common/message/messages.ts";
import { PieceType } from "../../common/game-types.ts";     
import { clientManager, socketManager } from "./managers.ts";
import { GameManager } from "./game-manager.ts";            // Fixed the reference
import { GameEngine } from "../../common/game-engine.ts"

export let gameManager: GameManager | null = null;

/**
 * An endpoint used to establish a websocket connection with the server.
 *
 * The websocket is used to stream messages to and from the client.
 */
export const websocketHandler: WebsocketRequestHandler = (ws, req) => {
    const sessionId = req.cookies.id;  
    ws.on("close", () => {
        socketManager.handleSocketClosed(sessionId);
    });

    ws.on("message", (data) => {
        const message = parseMessage(data.toString());
        console.log("Received message from socket ID", sessionId + ":", message.toJson());

        if (message instanceof RegisterWebsocketMessage) {
            socketManager.registerSocket(sessionId, ws);
        } else if (
            message instanceof GameInterruptedMessage ||
            message instanceof PlacementMessage
        ) {
            if (gameManager !== null) gameManager?.handleMessage(message, req.cookies.id);
        }
    });
};

export const apiRouter = Router();

apiRouter.get("/client-information", (req, res) => {
    const clientType = clientManager.getClientType(req.cookies.id);
    const isGameActive = gameManager !== null && !gameManager.isGameEnded();
    return res.send({
        clientType,
        isGameActive,
    });
});

apiRouter.get("/board-state", (_, res) => {
    if (gameManager === null) {
        console.warn("Invalid attempt to fetch board state");
        return res.status(400).send({ message: "No game is currently active" });
    }
    return res.status(200).send(gameManager.getBoardState());
});

// A client will post this request whenever they are ready to start a game
apiRouter.post("/start-game", (req, res) => {                       // Fixed the incorrect API endpoint
    const hostPiece = req.query.hostPiece as PieceType;             // Missing import fixed
    gameManager = new GameManager(
        new GameEngine(hostPiece),
        socketManager,
        hostPiece,
        clientManager,
    );
    clientManager.sendToClient(new GameStartedMessage());
    return res.send({ message: "success" });
});

// Modified: Missing Implementation of "/game-state" API endpoint
// Expected Result: The server returns the current game state and allows you to continue with the game.
apiRouter.get("/game-state", (_, res) => {
    // If gameManager is null, that means the game has not started yet.
    if (gameManager === null) {
        console.warn("Invalid attempt to fetch game state");
        return res.status(400).send({message: "No game is currently active"});
    }
    return res.status(200).send(gameManager.getGameState());
})
