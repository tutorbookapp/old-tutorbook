import os

for package in os.listdir("./"):
    print(f"[DEBUG] Unpublishing tutorbook-{package}...")
    os.system(f"npm unpublish tutorbook-{package} --force")
