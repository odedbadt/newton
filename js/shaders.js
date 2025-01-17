export const NEWTON_FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_zoom;
uniform vec2 u_mouse_coord;
uniform vec2 u_roots[{% n %}];
uniform vec3 u_colors[{% color_count %}];

out vec4 fragColor;
const int MAX_ITERATIONS = 100;
const float SQUARED_BAILOUT = 0.05;
const float PI = 3.1415926535897932384626433832795;
const int N = {% n %};
vec2 square(vec2 v) {
    float w = v.x * v.x - v.y * v.y;
    float z = 2.0 * v.x * v.y;
    return vec2(w, z);
}
float atan2(vec2 v) {
    float atn = atan(v.y/v.x);
    if (v.x < 0.0) {
        return atn + PI;
    }
    if (v.y >= 0.0) {
        return atn;
    }
    return atn + PI*2.0;
}
vec2 to_polar(vec2 v) {
    float ang = atan2(v);
    float rad2 = v.x*v.x+v.y*v.y;
    return vec2(sqrt(rad2), ang);
}
vec2 to_cart(vec2 v) {
    return v[0]*vec2(cos(v[1]),sin(v[1]));
}
vec2 product(vec2 v1, vec2 v2) {
    vec2 polar1 = to_polar(v1);
    vec2 polar2 = to_polar(v2);
    return to_cart(vec2(polar1[0]*polar2[0], polar1[1]+polar2[1]));
}
vec2 product(int n, vec2 v) {
    return float(n) * v;
}
vec2 product(float x, vec2 v) {
    return x * v;
}
vec2 product(vec2 v, int n) {
    return float(n) * v;
}
vec2 product(vec2 v, float x) {
    return x * v;
}
vec2 quot(vec2 v1, vec2 v2) {
    vec2 polar1 = to_polar(v1);
    vec2 polar2 = to_polar(v2);
    return to_cart(vec2(polar1[0]/polar2[0], polar1[1]-polar2[1]));
}
vec2 quot(int n, vec2 v) {
    return 1.0/float(n) * v;
}
vec2 quot(float x, vec2 v) {
    return 1.0/x * v;
}
vec2 quot(vec2 v, int n) {
    return 1.0/float(n) * v;
}
vec2 quot(vec2 v, float x) {
    return 1.0/x * v;
}
vec2 whole_power(vec2 v, int n) {
    float ang = atan2(v);
    float rad2 = v.x*v.x+v.y*v.y;
    float f_n = float(n);
    return pow(rad2,f_n/2.0)*vec2(cos(ang*f_n),sin(ang*f_n));
}
vec2 complex_inv(vec2 v) {
    float ang = atan2(v);
    float rad2 = v.x*v.x+v.y*v.y;
    float rad = pow(rad2,0.5);
    return (1.0/rad)*vec2(cos(ang),-sin(ang));

}
float norm2(vec2 v) {
    return v.x * v.x + v.y * v.y;
}
vec2 diff(vec2 v1,vec2 v2) {
    return vec2(v1.x-v2.x,v1.y-v2.y);
}
float dist2(vec2 v1, vec2 v2) {
    return norm2(diff(v1,v2));
}
vec3 loop(vec2 S) {
    int C = MAX_ITERATIONS;
    int R = 0;
    vec2 A = S;
    for (int j = 0; j < MAX_ITERATIONS; j++) {
        // if (norm2(A) < SQUARED_BAILOUT/1000.0) {
        //     break;
        // }
        bool b = false;
        for (int k = 0; k < N; ++k) {
            if (dist2(A, u_roots[k]) < SQUARED_BAILOUT) {
                b = true;
                R = k;
            }
        }
        if (b) {            
            break;
        }
        A = {% recursion %};
        C = C - 1;
    }
    float value =  pow(1.0 - (float(C)/float(MAX_ITERATIONS)),0.25);
    vec3 base_color = value * u_colors[R % {% color_count %}];
    return value * vec3(1.0,1.0,1.0)+(1.0-value)*base_color;
}
void main( void ) {
    vec2 coord = (gl_FragCoord.xy - u_resolution.xy/2.0) / u_zoom;
    vec3 RGB = loop(coord);
    float screen_y = u_resolution.y- gl_FragCoord.y;
    for (int k = 0; k < N; ++k) {

        if (dist2(coord, u_roots[k]) < 0.03) {
            RGB = u_colors[k % {% color_count %}];
    
        }
    }
    if (dist2(u_mouse_coord.xy,gl_FragCoord.xy) < 100.0) {
        RGB = vec3(1.0,0.0,0.0);
    }
    if (dist2(u_mouse_coord.xy, 
    coord*u_zoom+u_resolution.xy/2.0) < 100.0) {
        RGB = vec3(0.0,0.0,0.0);
    }
    fragColor = vec4(RGB, 1.0);
}
`
export const VERTEX_SHADER = `
precision highp float;

// Vertex attributes
in vec3 position;
void main() {
    gl_Position = vec4( position, 1.0 );
}
`
/*

d2(v1,v2) = (v11-v21)(v11-v21)+(v12-v22)(v12-v22)
d2(v1/z,v2/z) = (v11/z-v21/z)(v11/z-v21/z)+(v12/z-v22/z)(v12/z-v22/z)=
(v11-v21)/z*(v11-v21)/z+(v12-v22)/z(v12-v22)/z=
(v11-v21)(v11-v21)/z/z+(v12-v22)(v12-v22)/z/z=
((v11-v21)(v11-v21)+(v12-v22)(v12-v22))/z/z=
d2(v1,v2)/z/z




*/