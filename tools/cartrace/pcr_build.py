import numpy as np, cv2, json
from PIL import Image
D=json.load(open('art.json')); ART=D['art']; CARS=D['cars']
crops={'hachi':(950,535,1460,700),'camss':(955,540,1505,700),'fox':(950,540,1500,700),'supra':(940,540,1510,700)}
old={'hachi':(972,1436,690),'camss':(978,1484,692),'fox':(972,1478,692),'supra':(958,1492,692)}
R=lambda v,n=2: round(float(v),n)
res={}
for c,(x0,y0,x1,y1) in crops.items():
    a=np.asarray(Image.open(c+'.png').convert('RGB'))[y0:y1,x0:x1]
    hsv=cv2.cvtColor(a,cv2.COLOR_RGB2HSV_FULL).astype(np.float32)/255
    S=hsv[...,1]; V=hsv[...,2]
    m=np.load(c+'_paint.npy').astype(np.uint8)
    H,W=m.shape

    # wheels from the rims (bright, unsaturated, low in the frame)
    rim=((V>0.6)&(S<0.16)).astype(np.uint8); rim[:int(H*0.45),:]=0
    rim=cv2.morphologyEx(rim,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    n0,l0,s0,_=cv2.connectedComponentsWithStats(rim)
    big=sorted(range(1,n0),key=lambda k:-s0[k,4])[:2]
    wh=[]
    for k in sorted(big,key=lambda k:s0[k,0]):
        x_,y_,w_,h_=s0[k,:4]; wh.append((x_+w_/2-0.5, y_+h_/2-0.5, w_/2))
    ground=old[c][2]-y0
    tireR=[ground-w[1] for w in wh]
    # lamps and intakes on the edge belong to the body too: bright or
    # saturated pixels next to the paint, then close and refill
    near=cv2.dilate(m,np.ones((9,9),np.uint8))
    ys0,xs0=np.nonzero(m); ex0,ex1=xs0.min(),xs0.max(); ends=(np.arange(W)[None,:]<ex0+0.14*(ex1-ex0))|(np.arange(W)[None,:]>ex1-0.14*(ex1-ex0))
    low=np.arange(H)[:,None]>H*0.42
    nearW=cv2.dilate(m,np.ones((27,27),np.uint8))
    bot0=np.array([np.nonzero(m[:,x])[0].max() if m[:,x].any() else 0 for x in range(W)])
    sill0=int(np.median([bot0[x] for x in range(int(wh[0][0])+int(W*0.08),int(wh[1][0])-int(W*0.08))]))
    above=np.arange(H)[:,None]<sill0-2
    extra=((((V>0.55)|((V>0.42)&(S<0.12)))&ends&low&(nearW==1))|((S>0.4)&(V>0.35)&(near==1))|((V<0.3)&ends&above&(near==1)))
    yy,xx=np.mgrid[0:H,0:W]
    for w,tr in zip(wh,tireR): extra[(xx-w[0])**2+(yy-w[1])**2<(tr+4)**2]=False
    extra[int(H*0.9):,:]=False
    m=(m|extra.astype(np.uint8))
    # windshield / rear glass seen edge-on: near-black strips along the top
    # edge of the greenhouse. Thin lines (the reference's outline) are
    # opened away; real glass strips stay.
    Lest=ex1-ex0
    upper=np.arange(H)[:,None]<ground-0.15*Lest
    dk=((V<0.15)&(S<0.35)&upper&(nearW==1)).astype(np.uint8)
    dk=cv2.morphologyEx(dk,cv2.MORPH_OPEN,np.ones((4,4),np.uint8))
    dk=(dk&cv2.dilate(m,np.ones((5,5),np.uint8)))|dk*0
    n1,l1,s1,_=cv2.connectedComponentsWithStats(dk)
    for k1 in range(1,n1):
        comp=(l1==k1)
        if s1[k1,4]>=25 and (cv2.dilate(comp.astype(np.uint8),np.ones((5,5),np.uint8))&m).any(): m[comp]=1
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    mc=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((11,11),np.uint8))
    m=np.where(ends&low,mc,m).astype(np.uint8)
    np.save(c+'_full.npy',m)
    inv=(1-m).copy(); mk=np.zeros((H+2,W+2),np.uint8); cv2.floodFill(inv,mk,(0,0),2); m=(inv!=2).astype(np.uint8)
    # extents of the body
    ys,xs=np.nonzero(m)
    xr,xf=xs.min(),xs.max()
    if c=='hachi': xr,xf=974-x0,1435-x0
    L=xf-xr+1
    U=lambda x,y:[R((x-xr)/L*100),R((ground-y)/L*100)]
    def smooth_trace(mask,eps,sig=7.5):
        # supersample, blur away the pixel stairs, trace, simplify; only real
        # turns stay hard corners (the renderer curves the rest)
        up=cv2.resize(mask.astype(np.float32),None,fx=4,fy=4,interpolation=cv2.INTER_NEAREST)
        up=cv2.GaussianBlur(up,(0,0),sig)
        mm=(up>0.5).astype(np.uint8)
        cs,_=cv2.findContours(mm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
        ap=cv2.approxPolyDP(max(cs,key=cv2.contourArea),eps*4,True).reshape(-1,2).astype(np.float64)/4
        pts=[]
        n=len(ap)
        for i in range(n):
            p0,p1,p2=ap[i-1],ap[i],ap[(i+1)%n]
            v1=p1-p0; v2=p2-p1
            ang=np.degrees(np.arccos(np.clip(np.dot(v1,v2)/(np.linalg.norm(v1)*np.linalg.norm(v2)+1e-9),-1,1)))
            q=U(p1[0],p1[1])
            pts.append(q+[1] if ang>50 else q)
        return pts
    # supra: lift the wing off the body (kept as its own spoiler part)
    wing=None
    if c=='supra':
        wm=np.zeros_like(m); cut=(np.arange(W)[None,:]<xr+0.17*L)&(np.arange(H)[:,None]<ground-0.205*L)
        wm[cut&(m==1)]=1; m[cut]=0; wing=wm
    # flatten the bottom under the wheel arches (the renderer cuts its own arches)
    bot=np.array([np.nonzero(m[:,x])[0].max() if m[:,x].any() else -1 for x in range(W)])
    wx=[w[0] for w in wh]
    between=[bot[x] for x in range(int(wx[0])+int(L*0.12),int(wx[1])-int(L*0.12))]
    sill=int(np.median(between))
    for w in wh:
        r=int(L*0.115)
        for x in range(int(w[0])-r,int(w[0])+r+1):
            if 0<=x<W and m[:,x].any():
                top=np.nonzero(m[:,x])[0].min()
                if bot[x]<sill: m[top:sill+1,x]=1
    shell=smooth_trace(m,2.0)
    # glass: dark pixels inside the body above the belt
    raw=np.load(c+'_raw.npy')
    mi=cv2.erode(m,np.ones((7,7),np.uint8))   # keep the roof rail / pillars above the glass
    g=((raw==0)&(mi==1)&(V<0.42)).astype(np.uint8)
    g[int(ground-0.165*L):,:]=0
    g=cv2.morphologyEx(g,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(g)
    order=sorted(range(1,n),key=lambda k:-st[k,4])
    glass=[]
    for k in order[:3]:
        if st[k,4]<0.06*st[order[0],4]: continue
        glass.append(smooth_trace((lab==k).astype(np.uint8),1.0,3.0))
    beltv=sorted(p[1] for p in glass[0])[1]
    wingpts=None
    if wing is not None:
        wingpts=smooth_trace(wing,1.2)
    # transform the old unit space onto the new one
    oa,ob,og=old[c]; Lo=ob-oa
    def T(p):
        q=[R(((p[0]/100*Lo+oa)-(xr+x0))/L*100),R(p[1]*Lo/L)]
        return q+p[2:]
    def TL(lst): return [T(p) for p in lst]
    A=json.loads(json.dumps(ART[c]))
    A['shell']=shell; A['glass']=glass
    A['wr']=R((wx[0]-xr)/L*100); A['wf']=R((wx[1]-xr)/L*100)
    tr_units=sum(tireR)/2/L*100
    A['wheelScale']=R(tr_units*CARS[c]['len']/100/CARS[c]['tr'],3)
    A['belt']=R(beltv,2)
    for key in ('interior','lamps','details','pillars'):
        if key in A: A[key]=[[e[0],TL(e[1])] for e in A[key]]
    for key in ('seams','creases'):
        if key in A: A[key]=[TL(pl) for pl in A[key]]
    if 'lines' in A: A['lines']=[[e[0],TL(e[1])] for e in A['lines']]
    for key in ('head','tail','exhaust'): A[key]=T(A[key])
    A['rocker']=R(A['rocker']*Lo/L); A['hood']=[T([A['hood'][0],0])[0],T([A['hood'][1],0])[0]]
    if 'lower' in A: A['lower']['y']=R(A['lower']['y']*Lo/L)
    for slot,v in A['kit'].items():
        for var,part in v.items():
            part['pts']=TL(part['pts'])
            if 'extra' in part: part['extra']=[TL(e) for e in part['extra']]
            for k2 in ('details','lamps'):
                if k2 in part: part[k2]=[[e[0],TL(e[1])] for e in part[k2]]
    if wingpts:
        A['kit']['spoiler']['stock']={'pts':wingpts}
    res[c]=A
    print(c,'L',L,'wheels',[round(w[0]+x0,1) for w in wh],'tireR',[round(t,1) for t in tireR],'ws',A['wheelScale'],'shell pts',len(shell),'glass',[len(g) for g in glass],'belt',A['belt'])
json.dump(res,open('newart.json','w'))

# ---- stock bumpers become slices of the traced body; the traced shell covers the sills
def clip(poly, keep):
    out=[]
    for i in range(len(poly)):
        A=poly[i]; B=poly[(i+1)%len(poly)]
        ia, ib = keep(A), keep(B)
        if ia: out.append(A)
        if ia!=ib:
            # x-boundary crossing
            xb=keep.x; t=(xb-A[0])/((B[0]-A[0]) or 1e-9)
            out.append([round(xb,2), round(A[1]+(B[1]-A[1])*t,2), 1])
    return out
class K:
    def __init__(s,x,side): s.x=x; s.side=side
    def __call__(s,p): return p[0]<=s.x if s.side<0 else p[0]>=s.x
for c in ('fox','camss','supra'):
    A=res[c]; kit=A['kit']
    rb=max(p[0] for p in kit['rbumper']['stock']['pts']); fb=min(p[0] for p in kit['fbumper']['stock']['pts'])
    kit['rbumper']['stock']['pts']=clip(A['shell'],K(rb,-1))
    kit['fbumper']['stock']['pts']=clip(A['shell'],K(fb,1))
    if 'skirt' in kit: del kit['skirt']
for c in ('fox','camss','hachi'):
    res[c]['kit'].pop('spoiler',None)
for c in res: res[c]['lines']=[]
# stock bumpers are slices of the body: no panel gap where they meet, no seam lines
for c in ('fox','camss','supra'):
    o=res[c]; k=o['kit']
    for sl in ('rbumper','fbumper'): k[sl]['stock']['flush']=True
    rb=max(p[0] for p in k['rbumper']['stock']['pts']); fb=min(p[0] for p in k['fbumper']['stock']['pts'])
    o['seams']=[pl for pl in o['seams'] if not all(abs(p[0]-rb)<0.4 or abs(p[0]-fb)<0.4 for p in pl)]
bands={'supra':[[50,63.3,2.1]],'fox':[[52,64,2.1],[13,28.5,1.6]],'camss':[[53,63.5,2.1],[20,29,1.4]],'hachi':[[55,69.5,2.1]]}
for c in bands: res[c]['wsGlass']=bands[c]
# mirrors: small body-colour pods tucked into the glass's front-bottom corner
mir={'supra':(55.4,58.6,17.0),'camss':(58.0,61.6,17.9),'fox':(59.6,62.6,18.3),'hachi':(62.2,65.2,20.4)}
for c,(a,b,y) in mir.items():
    res[c]['kit']['mirror']={'stock':{'pts':[[a,y],[b-0.6,y],[b,y+0.8],[b-0.3,y+1.9],[a+0.6,y+2.1],[a,y+1.4]]}}
# supra: silver oval headlamp like the reference
res['supra']['lamps'][0]=['headsilver',[[91.2,12.2],[93.0,10.6],[96.2,9.9],[98.4,10.4],[97.8,11.4],[95.4,12.2],[92.4,12.8]]]
json.dump(res,open('newart.json','w'))
print('clipped')
