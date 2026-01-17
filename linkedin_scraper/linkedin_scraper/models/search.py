"""Pydantic models for LinkedIn Search results."""

from typing import List, Optional
from pydantic import BaseModel, Field

class SearchResultItem(BaseModel):
    """A single item in search results."""
    urn_id: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None  # Name of person, company, or post title
    subtitle: Optional[str] = None  # Role, headline, etc.
    secondary_subtitle: Optional[str] = None  # Location, etc.
    summary: Optional[str] = None  # content summary (e.g. for posts)
    image_url: Optional[str] = None
    
    # Using generic dict for flexible extra data depending on result type
    # e.g., connection degree, followers count, etc.
    metadata: dict = Field(default_factory=dict) 

class SearchResults(BaseModel):
    """
    LinkedIn Search Results model.
    """
    keyword: str
    location: Optional[str] = None
    total_results_count: Optional[int] = None
    results: List[SearchResultItem] = Field(default_factory=list)

    def to_dict(self) -> dict:
        return self.model_dump()

    def to_json(self, **kwargs) -> str:
        return self.model_dump_json(**kwargs)
