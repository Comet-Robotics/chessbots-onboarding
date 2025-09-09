import { useEffect, useState } from "react";
import { GameEngine } from "../common/game-engine";
import { PieceType, Placement } from "../common/game-types";
import { MessageType } from "../common/message/message-types";
import { ClientType } from "../common/client-types";
import {
  PlacementMessage,
  RegisterWebsocketMessage,
} from "../common/message/messages";
import { GameFinishedReason } from "../common/game-end-reasons";

function useWebSocket() {
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);

  // Use effect is a special react function. As far as I know, It basically gets run anytime the component
  // it's attached to get re-rendered. In this case, whatever component calls the useWebSocket function
  useEffect(() => {
    const useSecureWebSocket = window.location.protocol === "https:";
    const wsProtocol = useSecureWebSocket ? "wss" : "ws";
    const ws = new WebSocket(
      wsProtocol + "://" + window.location.host + "/game-ws"
    );
    setWebSocket(ws);

    ws.onopen = () => {
      ws.send(new RegisterWebsocketMessage().toJson());
    };

    return () => {
      if (webSocket) webSocket.close();
    };
  }, []);

  return { webSocket };
}

type ClientInfo = {
  isGameActive: boolean;
  clientType: ClientType;
};

type InitialGameState = {
  hostPiece: PieceType;
  game: {
    board: PieceType[];
    currentTurn: PieceType;
  };
  gameEndReason: GameFinishedReason | undefined;
};

const gameFinishReasonToUserFriendlyDescriptionMap = {
  [GameFinishedReason.O_WON]: "O won the game!",
  [GameFinishedReason.X_WON]: "X won the game!",
  [GameFinishedReason.TIE]: "The game was a draw!",
}

function App() {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [initialGameState, setInitialGameState] =
    useState<InitialGameState | null>(null);
  const [gameEndReason, setGameEndReason] = useState<GameFinishedReason | null>(
    null
  );
  const { webSocket } = useWebSocket();

  const getInitialGameState = async () => {
    const res = await fetch("/api/game-state");

    const json = (await res.json()) as InitialGameState;
    setInitialGameState(null);
    if (json.gameEndReason) {
      setGameEndReason(json.gameEndReason)
    } else {
      setGameEndReason(null)
    };
    setInitialGameState(json);
  };

  // When this is run, a an api request is sent to the backend to start a game
  const startGame = async (hostPiece: PieceType) => {
    const query = new URLSearchParams();
    query.set("hostPiece", hostPiece);
    const startGameRes = await fetch(
      "/api/start-game?" + query.toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (!startGameRes.ok) {
      alert("Failed to start game");
    }


    await getInitialGameState();
  };

  useEffect(() => {
    fetch("/api/client-information")
      .then((res) => {
        if (!res.ok) {
          alert("Failed to get client information");
          return;
        }
        return res.json();
      })
      .then((json) => {
        setClientInfo(json);
      });
  }, []);

  useEffect(() => {
    if (clientInfo === null || clientInfo.isGameActive === false) {
      return;
    }

    const run = async () => {
      await getInitialGameState();
    };

    run();
  }, [clientInfo]);

  useEffect(() => {
    if (!webSocket) {
      return;
    }
    const listener = (event: MessageEvent) => {
      const parsedMessage = JSON.parse(event.data) as Record<string, any> & {
        type?: MessageType;
      };

      if (!parsedMessage.type) {
        console.error("Received message without type", parsedMessage);
        return;
      }

      if (parsedMessage.type == MessageType.GAME_STARTED) {
        const run = async () => {
          await getInitialGameState();
          window.location.reload();
        };
    
        run();
      } else if (parsedMessage.type == MessageType.GAME_FINISHED) {
        setGameEndReason(parsedMessage.reason);
      }
    }
    
    webSocket.addEventListener('message', listener)
    return () => {
      webSocket.removeEventListener('message', listener)
    }
  }, [webSocket]);
  
  const startGameButtonCallback = async () => {
      if (!clientInfo) {
        alert("No client info");
        return;
      }
      const hostPiece = PieceType.X;
      await startGame(hostPiece);
      window.location.reload();
    }

  return (
    <div className="App">
      <h1>Tic Tac Toe</h1>
      {gameEndReason && 
      <>
        <p>
          {gameFinishReasonToUserFriendlyDescriptionMap[gameEndReason]}
        </p>
          {clientInfo?.clientType === ClientType.HOST 
          && <button type="button" onClick={startGameButtonCallback}>Start new game</button>}
      </>  
      }
      {clientInfo === null ? (
        <p>Loading...</p>
      ) : initialGameState !== null ? (
        <TicTacToe
          currentPlayer={initialGameState.game.currentTurn}
          initialBoardState={initialGameState.game.board}
          localPlayer={
            clientInfo.clientType === ClientType.HOST
              ? PieceType.X
              : PieceType.O
          }
          spectating={clientInfo.clientType === ClientType.SPECTATOR}
          webSocket={webSocket}
          gameEnded={gameEndReason !== null}
        />
      ) : clientInfo.clientType !== ClientType.HOST ? (
        <p>
          There is no active game, but you are a {clientInfo.clientType} and
          cannot start a game. Please wait for the host to start a game.
        </p>
      ) : (
        <button
          type="button"
          onClick={startGameButtonCallback}
        >
          Start Game
        </button>
      )}
    </div>
  );
}

type TicTacToeProps = {
  // Represents the initial board positions when the component is mounted. Used to initialize local state hooks which are updated in real-time as the game progresses via the WebSocket.
  initialBoardState: PieceType[];
  
  // Represents the player that is playing when the component is mounted. Used to initialize local state hooks which are updated in real-time as the game progresses via the WebSocket.
  currentPlayer: PieceType;
  
  // Represents the piece that the local player is playing as.
  localPlayer: PieceType;
  
  // Specifies whether the current client is spectating the game. If the client is spectating, they cannot make moves so buttons are disabled.
  spectating: boolean;
  
  // A reference to the WebSocket connection used for sending and receiving game updates in real-time.
  webSocket: WebSocket | null;
  
  // Tracks whether the game has ended so that the game board can be disabled. True if the game has ended, false otherwise. 
  gameEnded: boolean
};

function TicTacToe(props: TicTacToeProps) {
  const { initialBoardState, currentPlayer, localPlayer, spectating, webSocket, gameEnded } = props;
  const [boardState, setBoardState] = useState<PieceType[]>(initialBoardState);
  const [player, setPlayer] = useState<PieceType>(currentPlayer);

  useEffect(() => {
    if (!webSocket) {
      return;
    }
    
    const listener = (event: MessageEvent) => {
      const parsedMessage = JSON.parse(event.data) as Record<string, any> & {
        type?: MessageType;
      };

      if (!parsedMessage.type) {
        console.error("Received message without type", parsedMessage);
        return;
      }

      if (parsedMessage.type == MessageType.PLACEMENT) {
        const placementMsg = parsedMessage.placement as Placement;
        const updatedBoardState = boardState;
        updatedBoardState[placementMsg.square] = placementMsg.pieceType;
        setBoardState(updatedBoardState);
        setPlayer(GameEngine.oppositePiece(placementMsg.pieceType));
      } 
    }
    
    webSocket.addEventListener('message', listener)
    return () => {
      webSocket.removeEventListener('message', listener)
    }
  }, [webSocket]);

  return (
    <>
      <p>Current Player Turn: {player}</p>
      <p>You Are: {localPlayer}</p>
      <div className="board-grid "
      style={{ display: "flex", flexDirection: "column", gap: "2rem", margin: "4rem" }}
      >
        <div style={{ display: "flex", flexDirection: "row"}}>
        {boardState.map((piece, pieceIndex) => {
          if(pieceIndex > 2){
            return;
          }
          return (
            <BoardTile
              key={`tile-${pieceIndex}`}
              piece={piece}
              
              disabled={
                spectating ||
                player !== localPlayer ||
                piece !== PieceType.BLANK
              }
              onClick={() => {
                const placement: Placement = {
                  pieceType: PieceType.X,
                  square: pieceIndex,
                };

                const newBoardState = boardState;
                newBoardState[pieceIndex] = localPlayer;
                setBoardState(newBoardState);
                
                if (!webSocket) {
                  console.error("No websocket connection");
                  return;
                }

                const msg = new PlacementMessage(placement);
                webSocket.send(msg.toJson());
                setPlayer(GameEngine.oppositePiece(player));
              }}
            />
          );
        })}
        </div>
        <div style={{ display: "flex", flexDirection: "row"}}>
        {boardState.map((piece, pieceIndex) => {
          if(pieceIndex < 3 || pieceIndex > 5){
            return;
          }
          return (
            <BoardTile
              key={`tile-${pieceIndex}`}
              piece={piece}
              
              disabled={
                spectating ||
                player !== localPlayer ||
                piece !== PieceType.BLANK
              }
              onClick={() => {
                const placement: Placement = {
                  pieceType: PieceType.X,
                  square: pieceIndex,
                };

                const newBoardState = boardState;
                newBoardState[pieceIndex] = localPlayer;
                setBoardState(newBoardState);
                
                if (!webSocket) {
                  console.error("No websocket connection");
                  return;
                }

                const msg = new PlacementMessage(placement);
                webSocket.send(msg.toJson());
                setPlayer(GameEngine.oppositePiece(player));
              }}
            />
          );
        })}
        </div>
        <div style={{ display: "flex", flexDirection: "row"}}>
        {boardState.map((piece, pieceIndex) => {
          if(pieceIndex < 6){
            return;
          }
          return (
            <BoardTile
              key={`tile-${pieceIndex}`}
              piece={piece}
              
              disabled={
                spectating ||
                player !== localPlayer ||
                piece !== PieceType.BLANK
              }
              onClick={() => {
                const placement: Placement = {
                  pieceType: PieceType.X,
                  square: pieceIndex,
                };

                const newBoardState = boardState;
                newBoardState[pieceIndex] = localPlayer;
                setBoardState(newBoardState);
                
                if (!webSocket) {
                  console.error("No websocket connection");
                  return;
                }

                const msg = new PlacementMessage(placement);
                webSocket.send(msg.toJson());
                setPlayer(GameEngine.oppositePiece(player));
              }}
            />
          );
        })}
        </div>
      </div>
    </>
  );
}

function BoardTile(props: {
  piece: PieceType;
  onClick: () => void;
  disabled: boolean;
}) {
  const { piece, onClick, disabled } = props;
  return (
    <button
      style={piece == PieceType.X ? {color: "red", margin:"4px"} : {color: "blue", margin:"4px"}}
      type="button"
      className="board-tile"
      disabled={disabled}
      onClick={onClick}
    >
      <p>{piece == PieceType.BLANK? " ":piece}</p>
    </button>
  );
}

export default App;
