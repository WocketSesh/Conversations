export class Conversation<T> {
  public conversations = new Map<Player, Player[]>()
  public event?: RemoteEvent = undefined
  private clientListener?: (arg: T, participants: Player[]) => void;
  private serverListener?: (arg: T, participants: Player[]) => void;

  start(players: Player[]) {
    for (let i = 0; i < players.size(); i++) {
      if (this.conversations.get(players[i])) {
        warn(`${players[i].Name} is already in a conversation, cannot start a new one with them.`)
        return;
      }
    }

    for (let i = 0; i < players.size(); i++) {
      this.conversations.set(players[i], players);
    }
  }

  end(player: Player) {
    let c = this.conversations.get(player);

    if (!c) return;

    for (let i = 0; i < c.size(); i++) {
      this.conversations.delete(c[i]);
    }

    c.clear();
  }

  leave(player: Player) {
    let c = this.conversations.get(player);
    if (!c) return;

    c.remove(c.indexOf(player));

    if (c.size() <= 1) this.end(player)
    else this.conversations.delete(player);
  }


  send(data: T) {
    if (game.GetService("RunService").IsServer()) {
      warn("Cannot send a message over conversation from server.")
      return;
    }

    if (!this.event) error("Error while trying to send message over conversation, could not find RemoteEvent " + tostring(getmetatable(this)));


    this.event.FireServer(data)
  }

  listen(cb: (arg: T, participants: Player[]) => void) {
    if (game.GetService("RunService").IsServer()) {
      this.serverListener = cb;
    } else this.clientListener = cb;
  }

  createEvent() {
    let name = tostring(getmetatable(this))

    this.event = game.GetService("ReplicatedStorage").FindFirstChild(name, true) as RemoteEvent;

    if (this.event) return;

    let x = new Instance("RemoteEvent", game.GetService("ReplicatedStorage"))
    x.Name = name;


    this.event = x as RemoteEvent;
  }

  constructor() {

    if (game.GetService("RunService").IsServer()) {
      this.createEvent();


      if (!this.event) error("Error while initializing conversations, could not find RemoteEvent for " + tostring(getmetatable(this)));

      this.event.OnServerEvent.Connect((player, d: unknown) => {
        let c = this.conversations.get(player);

        if (!c) return;

        if (this.serverListener) this.serverListener(d as T, c);

        for (let i = 0; i < c.size(); i++) {
          if (c[i] === player) continue;

          this.event?.FireClient(c[i], d)
        }
      })
    }
    else if (game.GetService("RunService").IsClient()) {

      if (!this.event) error("Error while initializing conversations, could not find RemoteEvent for " + tostring(getmetatable(this)));

      this.event.OnClientEvent.Connect((d: T, pariticpants: Player[]) => {
        if (this.clientListener) this.clientListener(d, pariticpants);
      })
    }
  }
}
