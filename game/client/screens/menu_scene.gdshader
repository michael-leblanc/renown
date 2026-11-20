// The main menu's painting (D250): Dawndoor's doorway at dawn, moving. Clouds drift, the water
// glitters, the grass sways, the light through the doorway shimmers. A port of doorFrames in
// scripts/art/ui/scenes.mjs, fed the menu's pieces (main_menu.mjs --pieces): change one, change
// the other. The stars and the dust are drawn over it by main_menu_sparks.gd.
// Put on a node the window's size; t runs from 0 to 1 and 1 meets 0. Works in the window's
// pixels (1152 x 648): every number below is from the painting.
shader_type canvas_item;

uniform sampler2D noise : filter_nearest, repeat_disable;     // Noise.png: the 512 x 512 grid, red the high byte, green the low
uniform sampler2D door_tex : filter_nearest, repeat_disable;  // Door.png: the doorway's stone over nothing
uniform sampler2D steps_tex : filter_nearest, repeat_disable; // Steps.png: the steps and fallen blocks over nothing
uniform sampler2D light : filter_nearest, repeat_disable;     // Light.png: red the light's glow on the stone (times 2), green its pool, blue the darkening
uniform vec2 door_at;
uniform vec2 steps_at;
uniform vec2 size = vec2(1152.0, 648.0);
uniform float t = 0.0;
uniform float drift = 96.0;
uniform float sx = 880.0;   // the doorway's middle
uniform float hy = 408.0;   // the horizon
uniform float base = 572.0; // the doorway's foot
uniform float top = 132.0;  // its top


float grid(int i, int j) {
	vec4 c = texelFetch(noise, ivec2(i & 511, j & 511), 0);
	return (round(c.r * 255.0) * 256.0 + round(c.g * 255.0)) / 65535.0;
}

// kit.mjs's vnoise: smooth noise, 0 to 1.
float vnoise(float x, float y) {
	vec2 f0 = floor(vec2(x, y));
	vec2 f = vec2(x, y) - f0;
	f = f * f * (3.0 - 2.0 * f);
	ivec2 i = ivec2(f0);
	return mix(mix(grid(i.x, i.y), grid(i.x + 1, i.y), f.x), mix(grid(i.x, i.y + 1), grid(i.x + 1, i.y + 1), f.x), f.y);
}

// scenes.mjs's smooth: a and b in either order.
float smooth_(float a, float b, float v) {
	float k = clamp((v - a) / (b - a), 0.0, 1.0);
	return k * k * (3.0 - 2.0 * k);
}

// Two samples of a moving noise blended so the movement loops: a at time t, b at t - 1.
float loop_(float a, float b, float k) {
	return 0.5 + ((a - 0.5) * (1.0 - k) + (b - 0.5) * k) / sqrt((1.0 - k) * (1.0 - k) + k * k);
}

vec3 sky_at(float k) {
	if (k <= 0.4) return mix(vec3(9.0, 12.0, 30.0), vec3(44.0, 36.0, 78.0), clamp(k / 0.4, 0.0, 1.0));
	if (k <= 0.72) return mix(vec3(44.0, 36.0, 78.0), vec3(152.0, 82.0, 86.0), (k - 0.4) / 0.32);
	if (k <= 0.9) return mix(vec3(152.0, 82.0, 86.0), vec3(234.0, 142.0, 86.0), (k - 0.72) / 0.18);
	return mix(vec3(234.0, 142.0, 86.0), vec3(255.0, 214.0, 142.0), clamp((k - 0.9) / 0.1, 0.0, 1.0));
}

float ground_at(float x) {
	return base - 4.0 - 50.0 * smooth_(640.0, 80.0, x) + smooth_(130.0, 300.0, abs(x - sx)) * (5.0 * sin(x / 190.0 + 1.0) + (vnoise(x / 46.0, 2.2) - 0.5) * 12.0);
}

float tuft_at(float x, float k) {
	return vnoise((x + 3.4 * sin(TAU * k + x / 37.0)) / 1.7, 9.4) * 13.0 * (0.3 + vnoise(x / 30.0, 1.1)) * (0.35 + 0.65 * smooth_(60.0, 150.0, abs(x - sx)));
}

float fbm(float x, float y) {
	return vnoise(x / 170.0 + 3.0, y / 34.0 + 7.0) * 0.58 + vnoise(x / 58.0 + 9.0, y / 13.0 + 2.0) * 0.3 + vnoise(x / 20.0, y / 5.5) * 0.12;
}

float ripple(float x, float y, float far, float at) {
	return vnoise(x / (5.0 + far * 26.0) + 3.0, (y - 64.0 * at * (0.3 + far)) / (1.3 + far * 3.4));
}

// A still piece at pixel p: its colour (0 to 255) and how much it covers.
vec4 still(sampler2D tex, vec2 at, ivec2 p) {
	ivec2 q = p - ivec2(at);
	ivec2 s = textureSize(tex, 0);
	if (q.x < 0 || q.y < 0 || q.x >= s.x || q.y >= s.y) return vec4(0.0);
	vec4 c = texelFetch(tex, q, 0);
	return vec4(c.rgb * 255.0, c.a);
}

void fragment() {
	vec2 p = UV * size;
	ivec2 pix = ivec2(floor(p));
	float x = p.x, y = p.y, t1 = t - 1.0, breath = 1.0 + 0.07 * sin(TAU * t), m;
	float ty = clamp(y / hy, 0.0, 1.0), far = clamp((y - hy) / 240.0, 0.0, 1.0);
	float mist = exp(-pow((y - hy + 3.0) / 11.0, 2.0)) * 0.5;
	float ground = ground_at(x);
	vec4 wl = still(door_tex, door_at, pix), fr = still(steps_tex, steps_at, pix);
	float wa = wl.a, fa = fr.a;
	float ga = y > ground - 15.0 ? clamp(y - (ground - tuft_at(x, t)) + 0.5, 0.0, 1.0) : 0.0;
	vec3 c = vec3(0.0);
	if (ga < 1.0 && fa < 1.0) {
		if (wa < 1.0 && y < hy) { // the sky: cloud, the sun and its glow, mist on the water's edge
			c = sky_at(ty);
			float amount = smooth_(0.14, 0.4, ty) * (1.0 - smooth_(0.9, 0.99, ty)) * 0.74;
			vec3 cloud = mix(vec3(92.0, 70.0, 104.0), vec3(250.0, 156.0, 106.0), smooth_(0.4, 0.88, ty));
			float cl = loop_(fbm(x + drift * t, y), fbm(x + drift * t1, y), t);
			m = smooth_(0.5, 0.66, cl) * amount; c += (cloud - c) * m;
			float dx = x - sx, ds2 = dx * dx + (y - (hy - 4.0)) * (y - (hy - 4.0));
			m = exp(-ds2 / (2.0 * 130.0 * 130.0)) * 0.6 * breath; c += (vec3(255.0, 222.0, 156.0) - c) * m;
			m = exp(-ds2 / (2.0 * 46.0 * 46.0)) * 0.62 * breath; c += (vec3(255.0, 240.0, 200.0) - c) * m;
			float sd = 36.0 - sqrt(ds2);
			if (sd > -1.0) { m = clamp(sd / 1.4 + 0.5, 0.0, 1.0); c += (vec3(255.0, 247.0, 214.0) - c) * m; }
			m = mist * (0.3 + 0.7 * cl); c += (vec3(255.0, 204.0, 156.0) - c) * m;
		} else if (wa < 1.0) { // the Long Water: the sun's path on it, glints further out
			float shine = exp(-pow((x - sx) / 300.0, 2.0)) * 0.35;
			float rp = loop_(ripple(x, y, far, t), ripple(x, y, far, t1), t);
			float path = clamp(1.0 - abs(x - sx) / (15.0 + (y - hy) * 1.05), 0.0, 1.0);
			c = vec3(120.0 + 135.0 * shine, 92.0 + 104.0 * shine, 88.0 + 40.0 * shine);
			c += (vec3(14.0, 28.0, 44.0) - c) * smooth_(0.0, 0.55, far);
			m = path * (0.2 + 0.8 * smooth_(0.41, 0.47, rp)) * (1.0 - far * 0.45) * 0.92; c += (vec3(255.0, 208.0, 132.0) - c) * m;
			m = smooth_(0.72, 0.8, rp) * 0.22 * (1.0 - far * 0.8) * (1.0 - path); c += (vec3(226.0, 160.0, 120.0) - c) * m;
			m = mist * 0.7; c += (vec3(255.0, 204.0, 156.0) - c) * m;
		}
		if (wa > 0.0) c += (wl.rgb - c) * wa;
	}
	if (ga > 0.0) { // the shore, dark against the light
		float dk = smooth_(0.0, 70.0, y - ground), gr = (vnoise(x / 3.0, y / 3.0) - 0.5) * 5.0;
		float lip = (y - ground < 1.6 && y >= ground) ? 0.35 * smooth_(900.0, 300.0, abs(x - sx)) : 0.0;
		vec3 s = vec3(18.0 - 13.0 * dk + gr, 21.0 - 15.0 * dk + gr, 17.0 - 11.0 * dk + gr);
		s += (vec3(128.0, 88.0, 48.0) - s) * lip;
		c += (s - c) * ga;
	}
	if (fa > 0.0) c += (fr.rgb - c) * fa;
	vec4 lv = texelFetch(light, pix, 0);
	float ray_w = round(lv.r * 255.0) / 255.0 / 2.0, ray_g = lv.g, dimmed = lv.b;
	// The light through the doorway, in lines from its middle that shimmer.
	float streak = 0.0;
	{
		float dx = x - sx, b = 0.0;
		if (abs(dx) <= 340.0 && y >= top - 30.0) b = floor((atan(y - hy, dx) / TAU + 0.5) * 719.99);
		float a = b / 720.0 * TAU;
		streak = 0.74 + 0.2 * sin(a * 19.0 + TAU * t) + 0.14 * sin(a * 43.0 - 2.0 * TAU * t + 1.3) + 0.08 * sin(a * 7.0 + TAU * t + 4.0);
	}
	float lit = (ray_w * wa * (1.0 - ga) * (1.0 - fa) + ray_g * (ga * (1.0 - fa) * (0.7 + 0.6 * vnoise(x / 6.0, y / 2.0)) + fa * 0.12)) * streak * breath;
	if (lit > 0.0) c += vec3(255.0, 166.0, 92.0) * lit;
	COLOR = vec4(clamp(round(c * dimmed), 0.0, 255.0) / 255.0, 1.0);
}
