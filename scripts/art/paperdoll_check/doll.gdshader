// A character drawn from its layer pictures (docs/art-layered-characters.md): of the layers worn, the NEARER PIXEL WINS, and
// the colour is filled in here. A layer pixel holds: red = channel * 16 + tone, green and blue = how far from the camera
// (high byte, low byte), alpha = there or not. Equally far: the later layer shows.
// worn: how many of layer0..layer9 are in use. colours: for each channel (16 places each) its tones, red, green, blue from 0 to 1.
// The layers must be drawn with nearest filtering (set below) and never scaled by a fraction: a blended pixel means nothing.
shader_type canvas_item;

uniform int worn = 0;
uniform vec3 colours[96];
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
		COLOR = vec4(0.0);
	} else {
		COLOR = vec4(colours[int(floor(code * 255.0 + 0.5))], 1.0) * tint;
	}
}
