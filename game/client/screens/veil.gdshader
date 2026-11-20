// The world behind a screen that covers the game, dimmed and greyed: the death
// screen's "veil" (death_screen.json). Put on a node that covers the window and is
// drawn after the world. Each colour goes `grey` of the way to its grey, then `dark`
// of the way to `tint`, then is darkened towards the corners.
shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture, filter_nearest;
uniform float dark = 0.5;
uniform float grey = 0.7;
uniform vec3 tint = vec3(0.0706, 0.0784, 0.102);
uniform float corners = 0.35;

void fragment() {
	vec3 c = texture(screen_texture, SCREEN_UV).rgb;
	float g = (c.r + c.g + c.b) / 3.0;
	c = mix(mix(c, vec3(g), grey), tint, dark);
	vec2 d = (UV - 0.5) * 2.0;
	COLOR = vec4(c * (1.0 - corners * dot(d, d)), 1.0);
}
