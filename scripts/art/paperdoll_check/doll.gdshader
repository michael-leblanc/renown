// A character drawn from its layer pictures (docs/art-layered-characters.md): of the layers worn, the NEARER PIXEL WINS, and
// the colour is filled in here. A layer pixel holds: red = channel * 16 + tone, green and blue = how far from the camera
// (high byte, low byte), alpha = there or not. Equally far: the later layer shows.
// worn: how many of layer0..layer9 are in use. colours: for each channel (16 places each) its tones, red, green, blue from 0 to 1.
// The outline: an empty pixel that touches the figure (up, down, left or right) takes outline_colour. It is added here, on
// the whole character after its layers are laid, so no layer picture holds it and it follows whatever is worn.
// outlined false: none. The picture needs one empty pixel round the figure (the 256 px frames have many).
// The part line (PART_LINE in scripts/art/style.mjs): where a layer whose bit is set in `lined` (a helm, a breastplate,
// pauldrons) shows in front of another layer, the pixel of the one behind next to it (up, down, left, right) takes
// outline_colour, when it is more than line_gap depth steps farther. lined 0: none.
// The tuck (TUCK in scripts/art/style.mjs): tucks[k] names the layers worn over layer k; where k wins by less than
// tuck_gap, the nearest of those shows instead (a tunic poking a little through a breastplate stays under it).
// The layers must be drawn with nearest filtering (set below) and never scaled by a fraction: a blended pixel means nothing.
shader_type canvas_item;

uniform int worn = 0;
uniform vec3 colours[256];
uniform bool outlined = true;
uniform vec3 outline_colour = vec3(0.14902, 0.145098, 0.129412);   // #262521, OUTLINE in scripts/art/style.mjs
uniform int lined = 0;          // bit k: layer k is lined
uniform float line_gap = 4.0;   // depth steps (1/8192 tile)
uniform int tucks[10];          // per layer k: bit j set when layer j is worn over it (TUCK in scripts/art/style.mjs)
uniform float tuck_gap = 400.0; // depth steps: a layer under, nearer than one over it by less than this, gives way to it
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

void take(vec4 t, int k, inout vec3 got) {
	if (t.a < 0.5) {
		return;
	}
	float far = floor(t.g * 255.0 + 0.5) * 256.0 + floor(t.b * 255.0 + 0.5);
	if (far <= got.y) {
		got = vec3(t.r, far, float(k));
	}
}

// The tuck: of the layers worn over the one that won (mask), the nearest that is at most tuck_gap farther takes its place.
void over(vec4 t, int j, int mask, float far0, inout vec3 got, inout float best) {
	if (((mask >> j) & 1) == 0 || t.a < 0.5) {
		return;
	}
	float far = floor(t.g * 255.0 + 0.5) * 256.0 + floor(t.b * 255.0 + 0.5);
	if (far - far0 < tuck_gap && far < best) {
		best = far;
		got = vec3(t.r, far, float(j));
	}
}

// The nearest pixel of the worn layers here: (code, how far, which layer); code -1 when none (or outside the picture).
vec3 nearest(vec2 uv) {
	vec3 got = vec3(-1.0, 70000.0, -1.0);
	if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
		return got;
	}
	if (worn > 0) { take(textureLod(layer0, uv, 0.0), 0, got); }
	if (worn > 1) { take(textureLod(layer1, uv, 0.0), 1, got); }
	if (worn > 2) { take(textureLod(layer2, uv, 0.0), 2, got); }
	if (worn > 3) { take(textureLod(layer3, uv, 0.0), 3, got); }
	if (worn > 4) { take(textureLod(layer4, uv, 0.0), 4, got); }
	if (worn > 5) { take(textureLod(layer5, uv, 0.0), 5, got); }
	if (worn > 6) { take(textureLod(layer6, uv, 0.0), 6, got); }
	if (worn > 7) { take(textureLod(layer7, uv, 0.0), 7, got); }
	if (worn > 8) { take(textureLod(layer8, uv, 0.0), 8, got); }
	if (worn > 9) { take(textureLod(layer9, uv, 0.0), 9, got); }
	int k = int(got.z);
	if (k >= 0 && tucks[k] != 0) {
		int m = tucks[k];
		float f0 = got.y;
		float best = 70000.0;
		vec3 won = got;
		if (worn > 0) { over(textureLod(layer0, uv, 0.0), 0, m, f0, won, best); }
		if (worn > 1) { over(textureLod(layer1, uv, 0.0), 1, m, f0, won, best); }
		if (worn > 2) { over(textureLod(layer2, uv, 0.0), 2, m, f0, won, best); }
		if (worn > 3) { over(textureLod(layer3, uv, 0.0), 3, m, f0, won, best); }
		if (worn > 4) { over(textureLod(layer4, uv, 0.0), 4, m, f0, won, best); }
		if (worn > 5) { over(textureLod(layer5, uv, 0.0), 5, m, f0, won, best); }
		if (worn > 6) { over(textureLod(layer6, uv, 0.0), 6, m, f0, won, best); }
		if (worn > 7) { over(textureLod(layer7, uv, 0.0), 7, m, f0, won, best); }
		if (worn > 8) { over(textureLod(layer8, uv, 0.0), 8, m, f0, won, best); }
		if (worn > 9) { over(textureLod(layer9, uv, 0.0), 9, m, f0, won, best); }
		got = won;
	}
	return got;
}

// Does a lined layer lie in front of this pixel (here: what nearest gave) at uv, another layer, more than line_gap nearer?
bool line_from(vec2 uv, vec3 here) {
	vec3 n = nearest(uv);
	return n.x >= 0.0 && n.z != here.z && ((lined >> int(n.z)) & 1) == 1 && here.y - n.y > line_gap;
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
	vec3 here = nearest(UV);
	float code = here.x;
	vec2 px = 1.0 / vec2(textureSize(layer0, 0));
	if (code < 0.0) {
		if (outlined && (covered(UV + vec2(px.x, 0.0)) || covered(UV - vec2(px.x, 0.0)) || covered(UV + vec2(0.0, px.y)) || covered(UV - vec2(0.0, px.y)))) {
			COLOR = vec4(outline_colour, 1.0) * tint;
		} else {
			COLOR = vec4(0.0);
		}
	} else if (lined != 0 && (line_from(UV + vec2(px.x, 0.0), here) || line_from(UV - vec2(px.x, 0.0), here)
			|| line_from(UV + vec2(0.0, px.y), here) || line_from(UV - vec2(0.0, px.y), here))) {
		COLOR = vec4(outline_colour, 1.0) * tint;
	} else {
		COLOR = vec4(colours[int(floor(code * 255.0 + 0.5))], 1.0) * tint;
	}
}
