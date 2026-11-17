class_name GameScene
extends Node
# The scene shown once the server has welcomed this client: the play view, which
# draws the land and the characters from `client.state` and sends the player's orders.

const CLIENT_SETTINGS := "res://data/client.json"

var client: NetClient = null
var play: PlayView = null


func setup(net_client: NetClient) -> void:
	client = net_client


func _ready() -> void:
	if client == null:
		return
	play = PlayView.new()
	play.name = "Play"
	play.setup(client.state, ClientSettings.load_file(CLIENT_SETTINGS), _send_order)
	add_child(play)


func _send_order(message: Dictionary) -> void:
	if client.is_playing():
		client._link.send_order(message)
