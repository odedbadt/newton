export const NEWTON_FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_zoom;
uniform vec2 u_mouse_coord;

out vec4 fragColor;
const int MAX_ITERATIONS = 100;
const float SQUARED_BAILOUT = 0.1;
const float PI = 3.1415926535897932384626433832795;

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
float loop(vec2 S) {
    int C = MAX_ITERATIONS;
    vec2 A = S;
    for (int j = 0; j < MAX_ITERATIONS; j++) {
        // if (norm2(A) < SQUARED_BAILOUT/1000.0) {
        //     break;
        // }
        if (dist2(whole_power(A, 3),vec2(1.0,0.0)) < SQUARED_BAILOUT) {
            break;
        }
        A = 2.0/3.0*A + 1.0/3.0*complex_inv(whole_power(A,2));    
        C = C - 1;
    }
    return pow(1.0 - (float(C)/float(MAX_ITERATIONS)),1.0/6.0);
}
void main( void ) {
    vec2 coord = (gl_FragCoord.xy - u_resolution.xy/2.0) / u_zoom;
    float M = atan2(coord)/PI/2.0;
    M = loop(coord);
    float R = M;
    float G = M;
    float B = M;
    float screen_y = u_resolution.y- gl_FragCoord.y;
    /*
    if ((abs(coord.x) < 1.0/u_zoom) || (abs(coord.y) < 1.0/u_zoom)) {
        R = 0.0;
        G = 0.0;
        B = 1.0;
    }
    if ((abs(coord.x-1.0) < 1.0/u_zoom) || (abs(coord.y-1.0) < 1.0/u_zoom)) {
        R = 0.0;
        G = 0.0;
        B = 1.0;
    }
    if (
        (abs(u_mouse_coord.x - gl_FragCoord.x) < 1.0 || 
         abs(screen_y - u_mouse_coord.y) < 1.0)  &&
            (abs(u_mouse_coord.x - gl_FragCoord.x) + 
            abs(screen_y - u_mouse_coord.y) < 40.0))
             {
        R = 1.0;
        G = 0.0;
        B = 0.0;

    }
    */
    fragColor = vec4(R, G, B, 1.0);
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
