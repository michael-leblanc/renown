class_name NetLink
extends Node
# The one node, at the same path on both sides, that carries every message of
# net/messages.gd as an RPC (D215): hello, welcome, view, order and refusal. Later
# tasks fill in the handlers and add no RPC. A message is a plain dictionary
# (NetMessages); the sender's peer id comes from the multiplayer, never from the
# message. The hello also carries the player id (D216) as its own argument.
#
# Server side: set on_hello and on_order. Client side: set on_welcome, on_view
# and on_refusal. A handler that is not set means the message is ignored.

var on_hello: Callable # (peer: int, player: String, message: Dictionary)
var on_order: Callable # (peer: int, message: Dictionary)
var on_welcome: Callable # (message: Dictionary)
var on_view: Callable # (message: Dictionary)
var on_refusal: Callable # (message: Dictionary)


# --- Sending -------------------------------------------------------------

func send_hello(player: String, message: Dictionary) -> void:
	hello.rpc_id(1, player, message)


func send_order(message: Dictionary) -> void:
	order.rpc_id(1, message)


func send_welcome(peer: int, message: Dictionary) -> void:
	welcome.rpc_id(peer, message)


func send_view(peer: int, message: Dictionary) -> void:
	view.rpc_id(peer, message)


func send_refusal(peer: int, message: Dictionary) -> void:
	refusal.rpc_id(peer, message)


# --- The five messages ---------------------------------------------------

@rpc("any_peer", "call_remote", "reliable")
func hello(player: String, message: Dictionary) -> void:
	if on_hello.is_valid() and NetMessages.is_plain(message):
		on_hello.call(multiplayer.get_remote_sender_id(), player, message)


@rpc("authority", "call_remote", "reliable")
func welcome(message: Dictionary) -> void:
	if on_welcome.is_valid():
		on_welcome.call(message)


# Reliable: a view is far above one packet (Godot warns for an unreliable one).
@rpc("authority", "call_remote", "reliable")
func view(message: Dictionary) -> void:
	if on_view.is_valid():
		on_view.call(message)


@rpc("any_peer", "call_remote", "reliable")
func order(message: Dictionary) -> void:
	if on_order.is_valid() and NetMessages.is_plain(message):
		on_order.call(multiplayer.get_remote_sender_id(), message)


@rpc("authority", "call_remote", "reliable")
func refusal(message: Dictionary) -> void:
	if on_refusal.is_valid():
		on_refusal.call(message)
