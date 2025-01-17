import { NEWTON_FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders.js";
import * as THREE from 'three'
import { derivative, simplify } from 'mathjs'
//import {Camera, Scene, PlaneBufferGeometry, Vector2, RawShaderMaterial}
function simplify_for_glsl(poly) {
    const smp = simplify;
    const step1 = simplify(poly, [
        // Expand multiplication
        'n1*n2 -> product(n1,n2)',
        'n1/n2 -> quot(n1,n2)',
        'n1^c -> whole_power(n1,c)',
        'c-n1 -> vec2(c,0)-n1',
        'n1-c -> n1 - vec2(c,0)',
        'c+n1 -> vec2(c,0)+n1',
        'n1+c -> n1 + vec2(c,0)',
    ]).toString()
    const step2 = step1.replace(/r(\d+)/g, 'u_roots[$1]')
    return step2.replace(/x/g, 'A')
}
const BASE_COLORS = [
    [1,0,0],
    [0,1,0],
    [0,0,1],
    [1,1,0],
    [1,1,1],
    [1,0,1],
    [1,1,1],
]
class App {

    constructor(n) {
        this.n = n
        this.zoom = 100
        this._dragged_root = null;
        this.mouse = new THREE.Vector2(0,0)
        this.roots = [];
        const poly_str_builder = []
        for (let j = 0; j < n; j++) {
            const r = 1// + (j*j / n)
            const real = Math.cos(j / n * Math.PI * 2) * r
            const imag = Math.sin(j / n * Math.PI * 2) * r
            this.roots.push([real, imag])
            poly_str_builder.push(`(x - r${j})`)
        }

        const poly_str = poly_str_builder.join('*')
        const derivative_expr = derivative(poly_str, 'x')
        this.glsl_recursion = simplify_for_glsl(`x - (${poly_str})/(${derivative_expr})`)

        this.preprocesed_shader = NEWTON_FRAGMENT_SHADER
        .replace(/{% n %}/g, n)
        .replace('{% recursion %}', this.glsl_recursion)
        .replace(/{% color_count %}/g, BASE_COLORS.length)
        .replace(/{% poly %/g, this.glsl_poly_str)

        this.newton_canvas = document.getElementById('newton-canvas');
        this.dpr= window.devicePixelRatio;
        this.dirty = true
    }



    event_to_complex_coords(e) {
        return new THREE.Vector2((e.offsetX * this.dpr
    -this.newton_canvas.width/2)/this.zoom,
    -(e.offsetY * this.dpr
    -this.newton_canvas.height/2)/this.zoom)
    }
    event_to_mouse_coords(e) {
        return new THREE.Vector2(e.offsetX * this.dpr,
        (this.newton_canvas.height - e.offsetY * this.dpr))
    }
    init() {
        this.init_size()
        this.init_mouse_events()
        this.animate()
    }
    render() {

        const newton_context = this.newton_canvas.getContext('webgl2');
        const camera = new THREE.Camera();
        camera.position.z = 1;

        const newton_scene = new THREE.Scene();

        const geometry = new THREE.PlaneGeometry(2, 2);

        const newton_uniforms = {
            u_time: { type: "f", value: 1.0 },
            u_resolution: { type: "v2", value: 
            new THREE.Vector2(this.newton_canvas.width,
                              this.newton_canvas.height) },
            u_mouse_coord: { type: "v2", value: this.mouse},
            u_zoom: { type: "f", value: 100 },
            u_roots: { type: "v2v", value: this.roots.flat() },
            u_colors: { type: "v2v", value: BASE_COLORS.flat()}

        };
        const newton_material = new THREE.RawShaderMaterial({
            uniforms: newton_uniforms,
            vertexShader: VERTEX_SHADER,
            fragmentShader: this.preprocesed_shader,
            glslVersion: THREE.GLSL3
        });

        newton_scene.add(new THREE.Mesh(geometry, newton_material));

        const newton_renderer = new THREE.WebGLRenderer({
            canvas: this.newton_canvas,
            context: newton_context
        })
        const rect = this.newton_canvas.getBoundingClientRect()

        newton_renderer.setPixelRatio(this.dpr);
        newton_renderer.setSize(rect.width,
            rect.height)
        newton_renderer.render(newton_scene, camera);

    }
    animate() {
        if (this.dirty) {
            this.render();   
            this.dirty = false;     
        }
        requestAnimationFrame(this.animate.bind(this));
    }
    init_size() {
        const onWindowResize =(event) =>{
            const rect = this.newton_canvas.getBoundingClientRect()
            this.newton_canvas.width = rect.width * this.dpr;
            this.newton_canvas.height = rect.height * this.dpr;
            this.zoom = 100;//Math.min(rect.width, rect.height) * this.dpr;
            this.dirty = true;
        }
        onWindowResize();

        window.addEventListener('resize', onWindowResize, false);

    }
    init_mouse_events() {
        // non symmetrical application of zoom as written in shader:
        // dist2(u_mouse_coord.xy, coord*u_zoom+u_resolution.xy/2.0) < 100.0)
        // coord = 
        const h_w = this.newton_canvas.width/2
        const h_h = this.newton_canvas.height/2;
        console.log('HW', h_w)
        console.log('HW', h_h)
        const dist2z = (mouse_coord_v2, root_arr) => 
            (mouse_coord_v2.x-(root_arr[0]*this.zoom +h_w))*(mouse_coord_v2.x-(root_arr[0]*this.zoom +h_w))+
            (mouse_coord_v2.y-(root_arr[1]*this.zoom +h_h))*(mouse_coord_v2.y-(root_arr[1]*this.zoom +h_h))
        this.newton_canvas.addEventListener('mousedown', (e) => {
            this.mouse = this.event_to_mouse_coords(e)
            console.log(this.mouse);
            for (let j = 0; j < this.n; ++j) {
                if (dist2z(this.mouse, this.roots[j]) < 100*this.dpr*this.dpr) {
                    this._dragged_root = j;

                }
            }
            this.dirty = true
        })
        this.newton_canvas.addEventListener('mousemove', (e) => {
            this.mouse = this.event_to_mouse_coords(e)
            const coord = this.event_to_complex_coords(e)
            //console.log(coord)
            if (this._dragged_root != null) {
              //  console.log('D',this._dragged_root)
                this.roots[this._dragged_root] = [coord.x,coord.y]
            }        
            this.dirty = true
        })
        this.newton_canvas.addEventListener('mouseup', (e) => {
            this._dragged_root = null;
            this.dirty = true
        })
    }
        
}




function app_ignite() {
    const url = new URL(window.location.href);
    const url_params = new URLSearchParams(url.search)
    const root_count = (url_params && url_params.get("root_count")) || 5;
    window._app = new App(root_count);
    window._app.init();
}

window.addEventListener('load', app_ignite);
