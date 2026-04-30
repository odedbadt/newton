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
        this.zoom = 10
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

        const newton_context = this.newton_canvas.getContext('webgl2');
        this.camera = new THREE.Camera();
        this.camera.position.z = 1;

        this.newton_scene = new THREE.Scene();

        const geometry = new THREE.PlaneGeometry(2, 2);

        this.newton_uniforms = {
            u_time: { type: "f", value: 1.0 },
            u_resolution: { type: "v2", value:
            new THREE.Vector2(this.newton_canvas.width,
                              this.newton_canvas.height) },
            u_mouse_coord: { type: "v2", value: this.mouse},
            u_zoom: { type: "f", value: this.zoom },
            u_roots: { type: "v2v", value: this.roots.flat() },
            u_colors: { type: "v2v", value: BASE_COLORS.flat()}
        };
        const newton_material = new THREE.RawShaderMaterial({
            uniforms: this.newton_uniforms,
            vertexShader: VERTEX_SHADER,
            fragmentShader: this.preprocesed_shader,
            glslVersion: THREE.GLSL3
        });

        this.newton_scene.add(new THREE.Mesh(geometry, newton_material));

        this.newton_renderer = new THREE.WebGLRenderer({
            canvas: this.newton_canvas,
            context: newton_context
        });
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
        this.init_scroll()
        this.animate()
    }
    render() {
        this.newton_uniforms.u_resolution.value.set(this.newton_canvas.width, this.newton_canvas.height);
        this.newton_uniforms.u_mouse_coord.value = this.mouse;
        this.newton_uniforms.u_zoom.value = this.zoom;
        this.newton_uniforms.u_roots.value = this.roots.flat();

        const rect = this.newton_canvas.getBoundingClientRect();

        this.newton_renderer.setPixelRatio(this.dpr);
        this.newton_renderer.setSize(rect.width, rect.height);
        this.newton_renderer.render(this.newton_scene, this.camera);
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
            this.zoom = 0.4*Math.min(rect.width, rect.height) * this.dpr;
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
    init_scroll() {
        this.newton_canvas.addEventListener('wheel', (event) => {
            event.preventDefault()
            // Get the modifiers pressed
            const ctrl_key = event.ctrlKey;
          
            // Access scroll properties
            const deltaX = event.deltaX; // Horizontal scroll
            const deltaY = event.deltaY; // Vertical scroll
          
          
            // Perform actions based on modifiers and scroll direction
            if (ctrl_key) {
                // Zoom:;
                // view_port.h, w changes
                // cursor in before and in after change has to be contant
                // const art_x_before_zoom = this.state.view_port.x + event.offsetX  / 
                // this.view_canvas.clientWidth * this.state.view_port.w;
                /* equations:
                // view_port_x_before + cursor_x*view_port_w_before / view_canvas_w = 
                // view_port_x_after + cursor_x*view_port_w_after  / view_canvas_w
                // view_port_y_before + cursor_x*view_port_h_before / view_canvas_h = 
                // view_port_y_after + cursor_x*view_port_h_after  / view_canvas_h
                // thus:
                // view_port_y_after = view_port_y_before + cursor_y*(view_port_h_before-view_port_h_after) / view_canvas_h
                // view_port_x_after = view_port_x_before + cursor_x*(view_port_w_before-view_port_w_after) / view_canvas_w
                // view_port_y_after = view_port_y_before + cursor_y*deltaY/ view_canvas_h
                // view_port_x_after = view_port_y_after*aspect;
                */
                this.zoom = this.zoom + deltaY;
                // const aspect = this.state.view_port.w / this.state.view_port.h;
                // const ratio_h = Math.exp(deltaY/1000);
                // const delta_h = this.state.view_port.h*(ratio_h-1)
                // this.state.view_port.y = this.state.view_port.y - event.offsetY * delta_h/ this.view_canvas.clientHeight;
                // this.state.view_port.x = this.state.view_port.x - event.offsetX * delta_h*aspect/ this.view_canvas.clientWidth;
                // this.state.view_port.h = Math.max(1, this.state.view_port.h*ratio_h)
                // this.state.view_port.w = this.state.view_port.h*aspect;
            } else {
                // this.state.view_port.y = Math.max(0, this.state.view_port.y+deltaY/ this.view_canvas.clientHeight*100)
                // this.state.view_port.x = Math.max(0, this.state.view_port.x+deltaX/ this.view_canvas.clientWidth*100)
            }
            this.dirty = true


            
        });
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
