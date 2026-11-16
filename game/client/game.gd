class_name GameScene
extends Node
# The scene shown once the server has welcomed this client. Empty until CLI-002
# draws the land and the characters from `client.state`.

var client: NetClient = null


func setup(net_client: NetClient) -> void:
	client = net_client
