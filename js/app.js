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
    const step2 =step1.replace(/r(\d)/g,'u_roots[$1]')
    return step2.replace(/x/g,'A')
    }
function norm2(v) {
    return v[0]*v[0]+v[1]*v[1]
}
function minus(v1, v2) {
    return [v1[0] - v2[0],v1[1] - v2[1]]
}
function dist2(v1, v2) {
    return norm2(minus(v1,v2))
}
function flatten(array_of_pairs) {
    const ret = new Float32Array(array_of_pairs.length*2);
    for (let j = 0; j < array_of_pairs.length;++j) {
        ret[j*2] = array_of_pairs[j][0];
        ret[j*2+1] = array_of_pairs[j][1];
    }
    return ret;
}
class App {

    constructor(n) {
        this.n = n
        this.u_zoom = 100
        this._dragged_root = null
        this.u_mouse = new THREE.Vector2(0,0)
        this.roots = []
        const poly_str_builder = []
        for (let j = 0; j < n; j++) {
            const r = 1
            const real = Math.cos(j / n * Math.PI * 2)*r
            const imag = Math.sin(j / n * Math.PI * 2)*r
            this.roots.push([real, imag])
            poly_str_builder.push(`(x - r${j})`)
        }

        const poly_str = poly_str_builder.join('*')
        const derivative_expr = derivative(poly_str, 'x')
        this.glsl_recursion = simplify_for_glsl(`x - (${poly_str})/(${derivative_expr})`)
            
        this.preprocesed_shader = NEWTON_FRAGMENT_SHADER.replace(/{% n %}/g,n).replace('{% recursion %}', this.glsl_recursion).replace('{% poly %}', this.glsl_poly_str)
        this.newton_canvas = document.getElementById('newton-canvas');
        this.newton_context = this.newton_canvas.getContext('webgl2');
        this.u_resolution = new THREE.Vector2(this.newton_canvas.width, this.newton_canvas.height);
        this.u_zoom = 0.2 * Math.min(this.newton_canvas.width, this.newton_canvas.height);
}


    event_to_mouse_coordinate(e) {
        return [e.offsetX * window.devicePixelRatio,
                e.offsetY * window.devicePixelRatio]
    }
    event_to_complex_coordinate(e) {
        return [(e.offsetX * window.devicePixelRatio/
    this.newton_canvas.width - 0.5)/this.u_zoom,
    (0.5 - e.offsetY * window.devicePixelRatio/
    this.newton_canvas.height)/this.u_zoom]
    }
    init() {



        this.animate();
        this.init_mouse_events()
        this.init_canvas_size()
    }


    render() {
        const camera = new THREE.Camera();
        camera.position.z = 1;
        const geometry = new THREE.PlaneGeometry(2, 2);
        const newton_scene = new THREE.Scene();
        const newton_uniforms = {
            u_time: { type: "f", value: 1.0 },
            u_resolution: { type: "v2", value: new THREE.Vector2() },
            u_mouse_coord: { type: "v2", value: this.u_mouse },
            u_zoom: { type: "f", value: this.u_zoom },
            u_roots: { type: "v2v", value: this.roots.flat()}
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
            context: this.newton_context
        })
        newton_renderer.setPixelRatio(window.devicePixelRatio);
        
        newton_renderer.render(newton_scene, camera);

    }
    animate() {
        this.render()
        //requestAnimationFrame(this.animate.bind(this));
    }
    init_canvas_size() {
        const onWindowResize = (event) =>{
            if (this.newton_renderer)  {
                this.newton_renderer.setSize(this.newton_canvas.width, this.newton_canvas.height);
            }
            this.u_resolution = new THREE.Vector2(this.newton_canvas.width, this.newton_canvas.height);
        }
        onWindowResize();
        window.addEventListener('resize', onWindowResize, false);

    }
    init_mouse_events() {
        this.newton_canvas.onmousedown = (e) => {
            for (let j = 0; j < this.n; ++j) {
                const coord = this.event_to_complex_coordinate(e)
                const d = dist2(coord, [this.roots[j][0],this.roots[j][1]])
                console.log(j,coord,d)
                 if (dist2(coord, [this.roots[j][0],this.roots[j][1]]) < 1) {
                    this._dragged_root = j
                }

            }
        }
        
        this.newton_canvas.onmousemove =  (e) =>{
            const coord = this.event_to_complex_coordinate(e)
            const mouse = this.event_to_mouse_coordinate(e)
            this.u_mouse = new THREE.Vector2(mouse[0], mouse[1])
            //console.log(coord, this._dragged_root)
            if (this._dragged_root != null) {
                const new_root = this.event_to_complex_coordinate(e)
                this.roots[this._dragged_root] = new_root;;
                this.dirty = true
                console.log(new_root, this._dragged_root, this.roots[this._dragged_root])
            }

        }
        this.newton_canvas.onmouseup = (e) => {
            this._dragged_root = null
        }
    }
}




function app_ignite() {
    window._app = new App(3);
    window._app.init();
}

window.addEventListener('load', app_ignite);
