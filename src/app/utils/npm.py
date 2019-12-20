import os


def unpublish(directory, prefix="tutorbook-"):
    for package in os.listdir(directory):
        print(f"[DEBUG] Unpublishing {prefix}{package}...")
        os.system(f"npm unpublish {prefix}{package} --force")


def publish(directory, prefix="@tutorbook/"):
    for package in os.listdir(directory):
        print(f"[DEBUG] Publishing {prefix}{package}...")
        os.system(f"cd {directory}{package} && npm publish --access public")


if __name__ == "__main__":
    publish("../packages/")
