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
        this.zoom = 100
        this.roots = [];
        const poly_str_builder = []
        for (let j = 0; j < n; j++) {
            const r = 1 + (j / n)
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

    }



    // event_to_complex_coordinate(e) {
    //     return [e.offsetX * window.devicePixelRatio/
    // document.getElementById('newton_canvas').width,
    // e.offsetY * window.devicePixelRatio/
    // document.getElementById('newton_canvas').height]
    // }
    init() {
        this.init_size()
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
            u_mouse_coord: { type: "v2", value: new THREE.Vector2(0,0) },
            u_zoom: { type: "f", value: this.zoom },
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
        newton_renderer.setPixelRatio(window.devicePixelRatio);

        newton_renderer.setSize(this.newton_canvas.width,
            this.newton_canvas.height)
            newton_renderer.render(newton_scene, camera);

    }
    animate() {
        this.render();
        //requestAnimationFrame(this.animate.bind(this));
    }
    init_size() {
        const onWindowResize =(event) =>{
            const rect = this.newton_canvas.getBoundingClientRect()
            this.newton_canvas.width = rect.width;
            this.newton_canvas.height = rect.height;
            this.zoom = 100;
        }
        onWindowResize();

        window.addEventListener('resize', onWindowResize, false);

    }
}




function app_ignite() {
    window._app = new App(7);
    window._app.init();
}

window.addEventListener('load', app_ignite);
