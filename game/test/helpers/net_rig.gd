class_name NetRig
extends RefCounted
# Runs a server and clients in one test process (NET-002). Each side is a branch:
# a root node with its own multiplayer (SceneTree.set_multiplayer) and a NetLink
# under it at the same relative path, so the RPCs find each other over loopback.


class Branch:
	extends RefCounted
	var root: Node
	var api: MultiplayerAPI
	var link: NetLink
	var welcomes: Array = []
	var views: Array = []
	var refusals: Array = []

	func connected() -> bool:
		var peer := api.multiplayer_peer
		return peer != null and peer.get_connection_status() == MultiplayerPeer.CONNECTION_CONNECTED

	func disconnected() -> bool:
		var peer := api.multiplayer_peer
		return peer == null or peer.get_connection_status() == MultiplayerPeer.CONNECTION_DISCONNECTED


# A branch under `parent`, with its link recording what a client receives.
static func branch(parent: Node, branch_name: String) -> Branch:
	var b := Branch.new()
	b.root = Node.new()
	b.root.name = branch_name
	parent.add_child(b.root)
	b.link = NetLink.new()
	b.link.name = "Link"
	b.root.add_child(b.link)
	b.api = MultiplayerAPI.create_default_interface()
	parent.get_tree().set_multiplayer(b.api, b.root.get_path())
	b.link.on_welcome = func(m: Dictionary) -> void: b.welcomes.append(m)
	b.link.on_view = func(m: Dictionary) -> void: b.views.append(m)
	b.link.on_refusal = func(m: Dictionary) -> void: b.refusals.append(m)
	return b


# Starts a client on `b` towards the loopback port.
static func connect_client(b: Branch, port: int) -> Error:
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_client("127.0.0.1", port)
	if err == OK:
		b.api.multiplayer_peer = peer
	return err


# A port nobody listens on, picked by trying: the first that a server can bind.
static func free_port(first: int) -> int:
	for port in range(first, first + 200):
		var peer := ENetMultiplayerPeer.new()
		peer.set_bind_ip("127.0.0.1")
		if peer.create_server(port, 2) == OK:
			peer.close()
			return port
	return -1
