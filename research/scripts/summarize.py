import json, os, glob

DATA = r"C:\Users\deepa\novonus-v2\research\data\sanctuary"

def show(slug, keys):
    p = os.path.join(DATA, slug + ".json")
    with open(p, encoding="utf-8") as f:
        d = json.load(f)
    print("#### " + slug)
    for k in keys:
        v = d.get(k)
        print("--", k, "--")
        print(json.dumps(v, indent=1)[:3000])

if __name__ == "__main__":
    import sys
    slug = sys.argv[1]
    keys = sys.argv[2].split(",")
    show(slug, keys)
