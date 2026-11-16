// A held part that comes in metals is painted in iron's six colours (D225). This swaps them for the six of the item's metal.
// from_colours and to_colours: the same tone at the same place, as red, green, blue from 0 to 1. Any other colour (wood) is left alone.
// The sprite must be drawn with nearest filtering, or blended edge pixels match no colour.
shader_type canvas_item;

uniform vec3 from_colours[6];
uniform vec3 to_colours[6];

varying vec4 tint;

void vertex() {
	tint = COLOR;   // the sprite's modulate (a flash, a fade): kept, and applied after the swap
}

void fragment() {
	vec4 c = texture(TEXTURE, UV);
	for (int k = 0; k < 6; k++) {
		if (distance(c.rgb, from_colours[k]) < 0.002) {
			c.rgb = to_colours[k];
			break;
		}
	}
	COLOR = c * tint;
}
