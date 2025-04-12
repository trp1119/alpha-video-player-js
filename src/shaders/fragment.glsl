precision lowp float;

uniform sampler2D u_Sampler;
varying vec2 v_Video_Texture_Position;
varying vec2 v_Alpha_Video_Texture_Position;

void main () {
  gl_FragColor = vec4(texture2D(u_Sampler, v_Video_Texture_Position).rgb, texture2D(u_Sampler, v_Alpha_Video_Texture_Position).r);
}