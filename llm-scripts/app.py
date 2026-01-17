from fastapi import FastAPI
from keywords import keywords_from_profile
from compare import compare_profiles
from filters import filters

app = FastAPI()


@app.post("/keywords")
def keywords_api(user_profile: dict):
    return {"keywords": keywords_from_profile(user_profile)}


@app.post("/compare")
def compare_api(payload: dict):
    return compare_profiles(payload["user"], payload["candidate"])


@app.post("/filters")
def filters_api(user_profile: dict):
    return filters(user_profile)
