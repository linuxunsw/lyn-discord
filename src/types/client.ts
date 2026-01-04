import { Client, ClientOptions, Collection } from "discord.js";
import { Command } from "./command";

export class BotClient extends Client {
  public commands: Collection<string, Command>;

  constructor(options: ClientOptions) {
    super(options);
    this.commands = new Collection();
  }
}
