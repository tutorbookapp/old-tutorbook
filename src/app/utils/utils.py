import os


def unpublish(directory, prefix="tutorbook-"):
    for package in os.listdir(directory):
        print(f"[DEBUG] Unpublishing {prefix}{package}...")
        os.system(f"npm unpublish {prefix}{package} --force")


def publish(directory, prefix="@tutorbook/"):
    for package in os.listdir(directory):
        print(f"[DEBUG] Publishing {prefix}{package}...")
        os.system(f"cd {directory}{package} && npm publish --access public")


def updateReqs(directory, prefix="@tutorbook/", vals=[]):
    for package in os.listdir(directory):
        vals.append(package)
    for package in os.listdir(directory):
        for jsfile in os.listdir(f"{directory}{package}"):
            if jsfile.endsWith(".js"):
                with fileinput.input(jsfile, inplace=True, backup=".bak") as file:
                    for line in file:
                        for val in vals:
                            line.replace(val, prefix + val)


if __name__ == "__main__":
    updateReqs("../packages/")
