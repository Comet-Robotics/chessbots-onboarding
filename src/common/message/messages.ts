import { MessageType } from "./message-types.ts";
import { GameFinishedReason, GameInterruptedReason } from "../game-end-reasons.ts";
import { Placement } from "../game-types.ts";
export abstract class Message {
    /**
     * Serializes the message as json.
     */
    public toJson(): string {
        return JSON.stringify(this.toObj());
    }

    protected abstract type: MessageType;

    /**
     * Sends this class to an object which can be serialized as json.
     * The only usage of this method is by `toJson`.
     */
    protected toObj(): object {
        return { type: this.type };
    }
}

export class RegisterWebsocketMessage extends Message {
    protected type = MessageType.REGISTER_WEBSOCKET;
}

export class PlacementMessage extends Message {
    constructor(public readonly placement: Placement) {
        super();
    }

    protected type = MessageType.PLACEMENT;

    protected toObj(): object {
        return {
            ...super.toObj(),
            placement: this.placement,
        };
    }
}
export class GameStartedMessage extends Message {
    constructor() {
        super();
    }

    protected type = MessageType.GAME_STARTED;
}

export class GameFinishedMessage extends Message {
    constructor(public readonly reason: GameFinishedReason) {
        super();
    }

    protected type = MessageType.GAME_FINISHED;

    protected toObj(): object {
        return {
            ...super.toObj(),
            reason: this.reason,
        };
    }
}

export class GameInterruptedMessage extends Message {
    constructor(public readonly reason: GameInterruptedReason) {
        super();
    }

    protected type = MessageType.GAME_INTERRUPTED;

    protected toObj(): object {
        return {
            ...super.toObj(),
            reason: this.reason,
        };
    }
}


/**
 * A function which can be used to send a message somewhere.
 */
export type SendMessage = (message: Message) => void;