// The ground shadows of what a character wears, as one: at each pixel the darkest (a shadow under a shadow is no darker).
// Each shadow picture is black and carries its own alpha. worn: how many of shadow0..shadow9 are in use.
shader_type canvas_item;

uniform int worn = 0;
uniform sampler2D shadow0 : filter_nearest;
uniform sampler2D shadow1 : filter_nearest;
uniform sampler2D shadow2 : filter_nearest;
uniform sampler2D shadow3 : filter_nearest;
uniform sampler2D shadow4 : filter_nearest;
uniform sampler2D shadow5 : filter_nearest;
uniform sampler2D shadow6 : filter_nearest;
uniform sampler2D shadow7 : filter_nearest;
uniform sampler2D shadow8 : filter_nearest;
uniform sampler2D shadow9 : filter_nearest;

void fragment() {
	float a = 0.0;
	if (worn > 0) { a = max(a, texture(shadow0, UV).a); }
	if (worn > 1) { a = max(a, texture(shadow1, UV).a); }
	if (worn > 2) { a = max(a, texture(shadow2, UV).a); }
	if (worn > 3) { a = max(a, texture(shadow3, UV).a); }
	if (worn > 4) { a = max(a, texture(shadow4, UV).a); }
	if (worn > 5) { a = max(a, texture(shadow5, UV).a); }
	if (worn > 6) { a = max(a, texture(shadow6, UV).a); }
	if (worn > 7) { a = max(a, texture(shadow7, UV).a); }
	if (worn > 8) { a = max(a, texture(shadow8, UV).a); }
	if (worn > 9) { a = max(a, texture(shadow9, UV).a); }
	COLOR = vec4(0.0, 0.0, 0.0, a);
}
