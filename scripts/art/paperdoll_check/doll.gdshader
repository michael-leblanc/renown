// A character drawn from its layer pictures (docs/art-layered-characters.md): of the layers worn, the NEARER PIXEL WINS, and
// the colour is filled in here. A layer pixel holds: red = channel * 16 + tone, green and blue = how far from the camera
// (high byte, low byte), alpha = there or not. Equally far: the later layer shows.
// worn: how many of layer0..layer9 are in use. colours: for each channel (16 places each) its tones, red, green, blue from 0 to 1.
// The outline: an empty pixel that touches the figure (up, down, left or right) takes outline_colour. It is added here, on
// the whole character after its layers are laid, so no layer picture holds it and it follows whatever is worn.
// outlined false: none. The picture needs one empty pixel round the figure (the 256 px frames have many).
// The layers must be drawn with nearest filtering (set below) and never scaled by a fraction: a blended pixel means nothing.
shader_type canvas_item;

uniform int worn = 0;
uniform vec3 colours[256];
uniform bool outlined = true;
uniform vec3 outline_colour = vec3(0.14902, 0.145098, 0.129412);   // #262521, OUTLINE in scripts/art/style.mjs
uniform sampler2D layer0 : filter_nearest;
uniform sampler2D layer1 : filter_nearest;
uniform sampler2D layer2 : filter_nearest;
uniform sampler2D layer3 : filter_nearest;
uniform sampler2D layer4 : filter_nearest;
uniform sampler2D layer5 : filter_nearest;
uniform sampler2D layer6 : filter_nearest;
uniform sampler2D layer7 : filter_nearest;
uniform sampler2D layer8 : filter_nearest;
uniform sampler2D layer9 : filter_nearest;

varying vec4 tint;

void vertex() {
	tint = COLOR;   // the node's modulate (a flash, a fade): applied after the colours
}

void take(vec4 t, inout float best, inout float code) {
	if (t.a < 0.5) {
		return;
	}
	float far = floor(t.g * 255.0 + 0.5) * 256.0 + floor(t.b * 255.0 + 0.5);
	if (far <= best) {
		best = far;
		code = t.r;
	}
}

bool there(sampler2D layer, vec2 uv) {
	return textureLod(layer, uv, 0.0).a >= 0.5;
}

// Is any worn layer at this place? Outside the picture: no.
bool covered(vec2 uv) {
	if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
		return false;
	}
	return (worn > 0 && there(layer0, uv)) || (worn > 1 && there(layer1, uv)) || (worn > 2 && there(layer2, uv))
		|| (worn > 3 && there(layer3, uv)) || (worn > 4 && there(layer4, uv)) || (worn > 5 && there(layer5, uv))
		|| (worn > 6 && there(layer6, uv)) || (worn > 7 && there(layer7, uv)) || (worn > 8 && there(layer8, uv))
		|| (worn > 9 && there(layer9, uv));
}

void fragment() {
	float best = 70000.0;
	float code = -1.0;
	if (worn > 0) { take(texture(layer0, UV), best, code); }
	if (worn > 1) { take(texture(layer1, UV), best, code); }
	if (worn > 2) { take(texture(layer2, UV), best, code); }
	if (worn > 3) { take(texture(layer3, UV), best, code); }
	if (worn > 4) { take(texture(layer4, UV), best, code); }
	if (worn > 5) { take(texture(layer5, UV), best, code); }
	if (worn > 6) { take(texture(layer6, UV), best, code); }
	if (worn > 7) { take(texture(layer7, UV), best, code); }
	if (worn > 8) { take(texture(layer8, UV), best, code); }
	if (worn > 9) { take(texture(layer9, UV), best, code); }
	if (code < 0.0) {
		vec2 px = 1.0 / vec2(textureSize(layer0, 0));
		if (outlined && (covered(UV + vec2(px.x, 0.0)) || covered(UV - vec2(px.x, 0.0)) || covered(UV + vec2(0.0, px.y)) || covered(UV - vec2(0.0, px.y)))) {
			COLOR = vec4(outline_colour, 1.0) * tint;
		} else {
			COLOR = vec4(0.0);
		}
	} else {
		COLOR = vec4(colours[int(floor(code * 255.0 + 0.5))], 1.0) * tint;
	}
}
