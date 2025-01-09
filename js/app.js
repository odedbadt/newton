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
class App {

    constructor(n) {
        this.n = n
        this.roots = new Float32Array(n*2)
        const poly_str_builder = []
        for (let j = 0; j < n; j++) {
            const r = 1+(j/n)
            const real = Math.cos(j / n * Math.PI * 2)*r
            const imag = Math.sin(j / n * Math.PI * 2)*r
            this.roots[j*2] = real, 
            this.roots[j*2+1] = imag
            poly_str_builder.push(`(x - r${j})`)
        }

        const poly_str = poly_str_builder.join('*')
        const derivative_expr = derivative(poly_str, 'x')
        this.glsl_recursion = simplify_for_glsl(`x - (${poly_str})/(${derivative_expr})`)
            
        this.preprocesed_shader = NEWTON_FRAGMENT_SHADER.replace(/{% n %}/g,n).replace('{% recursion %}', this.glsl_recursion).replace('{% poly %}', this.glsl_poly_str)
    }



    // event_to_complex_coordinate(e) {
    //     return [e.offsetX * window.devicePixelRatio/
    // document.getElementById('newton_canvas').width,
    // e.offsetY * window.devicePixelRatio/
    // document.getElementById('newton_canvas').height]
    // }
    init() {
        const newton_canvas = document.getElementById('newton-canvas');
        const newton_context = newton_canvas.getContext('webgl2');
        const camera = new THREE.Camera();
        camera.position.z = 1;

        const newton_scene = new THREE.Scene();

        var geometry = new THREE.PlaneGeometry(2, 2);

        const newton_uniforms = {
            u_time: { type: "f", value: 1.0 },
            u_resolution: { type: "v2", value: new THREE.Vector2() },
            u_mouse_coord: { type: "v2", value: new THREE.Vector2() },
            u_zoom: { type: "f", value: 1.0 },
            u_roots: { type: "v2v", value: this.roots}
        };
        const newton_material = new THREE.RawShaderMaterial({
            uniforms: newton_uniforms,
            vertexShader: VERTEX_SHADER,
            fragmentShader: this.preprocesed_shader,
            glslVersion: THREE.GLSL3
        });

        newton_scene.add(new THREE.Mesh(geometry, newton_material));

        const newton_renderer = new THREE.WebGLRenderer({
            canvas: newton_canvas,
            context: newton_context
        })
        newton_renderer.setPixelRatio(window.devicePixelRatio);


        function render() {
            newton_renderer.render(newton_scene, camera);

        }
        function animate() {
            requestAnimationFrame(animate);
            render();
        }
        function onWindowResize(event) {
            newton_renderer.setSize(newton_canvas.clientWidth, newton_canvas.clientHeight);
            newton_uniforms.u_resolution.value.x = newton_canvas.width;
            newton_uniforms.u_resolution.value.y = newton_canvas.height;
            newton_uniforms.u_zoom.value = 100;
            render();
        }
        onWindowResize();

        window.addEventListener('resize', onWindowResize, false);
        // newton_canvas.onmousedown = (e) =>
        //     if (dist2())
        
        newton_canvas.onmousemove = function (e) {


            newton_uniforms.u_mouse_coord.value.x = e.offsetX * window.devicePixelRatio;
            newton_uniforms.u_mouse_coord.value.y = e.offsetY * window.devicePixelRatio;
            document.getElementById('polynomial').innerHTML = ''

        }

        render()

    }
}




function app_ignite() {
    window._app = new App(7);
    window._app.init();
}

window.addEventListener('load', app_ignite);
