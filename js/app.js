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
    const step2 = step1.replace(/r(\d)/g, 'u_roots[$1]')
    return step2.replace(/x/g, 'A')
}
class App {

    constructor(n) {
        this.n = n
        this.zoom = 1000000
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

        this.preprocesed_shader = NEWTON_FRAGMENT_SHADER.replace(/{% n %}/g, n).replace('{% recursion %}', this.glsl_recursion).replace('{% poly %}', this.glsl_poly_str)
        this.newton_canvas = document.getElementById('newton-canvas');
        this.dpr=1;
    }



    event_to_complex_coords(e) {
        return new THREE.Vector2((e.offsetX * this.dpr
    -this.newton_canvas.width/2)/this.zoom,
    -(e.offsetY * this.dpr
    -this.newton_canvas.height/2)/this.zoom)
    }
    event_to_mouse_coords(e) {
        return new THREE.Vector2(e.offsetX * this.dpr,
        (this.newton_canvas.height - e.offsetY) * this.dpr)
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
            new THREE.Vector2(this.newton_canvas.width,this.newton_canvas.height) },
            u_mouse_coord: { type: "v2", value: this.mouse},
            u_zoom: { type: "f", value: 100 },
            u_roots: { type: "v2v", value: this.roots.flat() }
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
        newton_renderer.setPixelRatio(this.dpr);

        newton_renderer.setSize(this.newton_canvas.width,
            this.newton_canvas.height)
            newton_renderer.render(newton_scene, camera);

    }
    animate() {
        this.render();
        requestAnimationFrame(this.animate.bind(this));
    }
    init_size() {
        const onWindowResize =(event) =>{
            const rect = this.newton_canvas.getBoundingClientRect()
            this.newton_canvas.width = rect.width * this.dpr;
            this.newton_canvas.height = rect.height * this.dpr;
            this.zoom = 100;//Math.min(rect.width, rect.height) * this.dpr;
        }
        onWindowResize();

        window.addEventListener('resize', onWindowResize, false);

    }
    init_mouse_events() {
        // non symmetrical application of zoom as written in shader:
        // dist2(u_mouse_coord.xy, coord*u_zoom+u_resolution.xy/2.0) < 100.0)
        // coord = 
        /*
    if (dist2(u_mouse_coord.xy, 
        u_roots[0]  *u_zoom+u_resolution.xy/2.0) < 100.0) {
            R = 0.0;
            G = 1.0;
            B = 0.0;
        } */        
        const h_w = this.newton_canvas.width/2
        const h_h = this.newton_canvas.height/2
        const dist2z = (mouse_coord_v2, root_arr) => 
            (mouse_coord_v2.x-(root_arr[0]*this.zoom+h_w))*(mouse_coord_v2.x-(root_arr[0]*this.zoom+h_w))+
            (mouse_coord_v2.y-(root_arr[1]*this.zoom+h_h))*(mouse_coord_v2.y-(root_arr[1]*this.zoom+h_h))
        this.newton_canvas.addEventListener('mousedown', (e) => {
            this.mouse = this.event_to_mouse_coords(e)
            for (let j = 0; j < this.n; ++j) {
                if (dist2z(this.mouse, this.roots[j]) < 100) {
                    this._dragged_root = j;
                    console.log('D', j)       

                }
            }
        })
        this.newton_canvas.addEventListener('mousemove', (e) => {
            this.mouse = this.event_to_mouse_coords(e)
            const coord = this.event_to_complex_coords(e)
            console.log(coord)
            if (this._dragged_root != null) {
                this.roots[this._dragged_root] = [coord.x,coord.y]
            }        
        })
        this.newton_canvas.addEventListener('mouseup', (e) => {
            this._dragged_root = null;
        })
    }
        
}




function app_ignite() {
    window._app = new App(7);
    window._app.init();
}

window.addEventListener('load', app_ignite);
