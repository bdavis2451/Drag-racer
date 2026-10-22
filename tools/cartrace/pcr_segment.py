import numpy as np, cv2, json, colorsys
from PIL import Image
crops={'hachi':(950,535,1460,700),'camss':(955,540,1505,700),'fox':(950,540,1500,700),'supra':(940,540,1510,700)}
hue={'supra':(0.30,0.42,0.45,0.35),'fox':(0.58,0.68,0.5,0.3),'camss':(0.70,0.86,0.12,0.06),'hachi':(0.20,0.40,0.08,0.18)}
out={}
for c,(x0,y0,x1,y1) in crops.items():
    a=np.asarray(Image.open(c+'.png').convert('RGB'))[y0:y1,x0:x1]
    f=a.astype(np.float32)/255
    hsv=cv2.cvtColor(a,cv2.COLOR_RGB2HSV_FULL).astype(np.float32)
    Hh=hsv[...,0]/255; S=hsv[...,1]/255; V=hsv[...,2]/255
    h0,h1,smin,vmin=hue[c]
    m=((Hh>=h0)&(Hh<=h1)&(S>=smin)&(V>=vmin)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    k=1+np.argmax(st[1:,4]); m=(lab==k).astype(np.uint8)
    np.save(c+'_raw.npy',m)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    # fill holes
    H,W=m.shape; inv=(1-m).copy(); mk=np.zeros((H+2,W+2),np.uint8); cv2.floodFill(inv,mk,(0,0),2)
    m=((inv!=2)).astype(np.uint8)
    np.save(c+'_paint.npy',m)
    vis=a.copy(); vis[m==1]=(vis[m==1]*0.3+np.array([255,0,255])*0.7).astype(np.uint8)
    Image.fromarray(vis).resize((W*2,H*2),Image.NEAREST).save(c+'_seg.png')
    ys,xs=np.nonzero(m); print(c,'x',xs.min()+x0,xs.max()+x0,'y',ys.min()+y0,ys.max()+y0)
