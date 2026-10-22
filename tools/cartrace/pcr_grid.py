from PIL import Image, ImageDraw
import sys
ref={'hachi':(974,1435),'camss':(982,1482),'fox':(976,1476),'supra':(961,1491)}
c=sys.argv[1]; a,b=ref[c]; k=(b-a+1)/100; G=692
im=Image.open(c+'.png').convert('RGB')
u0,u1,v0,v1=[float(x) for x in sys.argv[2:6]]
x0=int(a+u0*k); x1=int(a+u1*k); y0=int(G-v1*k); y1=int(G-v0*k)
S=6
cr=im.crop((x0,y0,x1,y1)).resize(((x1-x0)*S,(y1-y0)*S),Image.NEAREST)
d=ImageDraw.Draw(cr)
import math
u=math.ceil(u0)
while u<u1:
    X=(a+u*k-x0)*S; col=(255,255,0) if u%5==0 else (120,120,0)
    d.line([(X,0),(X,cr.height)],fill=col,width=1)
    if u%5==0: d.text((X+2,2),str(u),fill=(255,255,0))
    u+=1
v=math.ceil(v0)
while v<v1:
    Y=(G-v*k-y0)*S; col=(0,255,255) if v%5==0 else (0,110,110)
    d.line([(0,Y),(cr.width,Y)],fill=col,width=1)
    if v%5==0: d.text((2,Y+2),str(v),fill=(0,255,255))
    v+=1
cr.save('g_'+c+'.png')
print(cr.size)
