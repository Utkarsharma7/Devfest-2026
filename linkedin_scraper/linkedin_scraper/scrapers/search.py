"""Search scraper for LinkedIn."""

import logging
import urllib.parse
from typing import Optional, List
from playwright.async_api import Page

from .base import BaseScraper
from ..models import SearchResults, SearchResultItem
from ..callbacks import ProgressCallback
from ..core.exceptions import ScrapingError

logger = logging.getLogger(__name__)


class SearchScraper(BaseScraper):
    """Async scraper for LinkedIn search results."""
    
    def __init__(self, page: Page, callback: Optional[ProgressCallback] = None):
        """
        Initialize search scraper.
        
        Args:
            page: Playwright page object
            callback: Progress callback
        """
        super().__init__(page, callback)
    async def apply_filter(self, filter_name: str, index: int = 0) -> None:
        """
        Apply a filter from the 'All filters' panel.
        
        Args:
           filter_name: Name of the filter section (e.g. "Current companies")
           index: Which checkbox to select (0-indexed)
        """
        try:
            logger.info(f"Applying filter: {filter_name} (index {index})")
            
            # 1. Open "All filters"
            # Try different possible selectors for the button
            btn = self.page.locator('.search-reusables__all-filters-pill-button').first
            if not await btn.count():
                # Fallback for small screens or different variants
                btn = self.page.locator('button:has-text("All filters")').first
                
            if await btn.count():
                await btn.click()
                await self.wait_and_focus(2) # Wait for modal
            else:
                logger.warning("Could not find 'All filters' button")
                return

            # 2. Find the filter section
            # The structure is usually a list of sections. 
            # We look for a header containing the filter name.
            # Then find the list of values within that section.
            
            # Using text locator for the header
            header = self.page.locator(f'h3:has-text("{filter_name}")').first
            # If not h3, try div or span
            if not await header.count():
                 header = self.page.locator(f'.reusable-search-filters__filter-list-title:has-text("{filter_name}")').first
                 
            if not await header.count():
                logger.warning(f"Filter section '{filter_name}' not found")
                # Debug capture
                try:
                    await self.page.screenshot(path=f"debug_filter_{filter_name.replace(' ', '_')}_not_found.png")
                    content = await self.page.content()
                    with open(f"debug_filter_{filter_name.replace(' ', '_')}.html", "w", encoding="utf-8") as f:
                        f.write(content)
                    logger.info("Saved debug filter info")
                except:
                    pass
                
                # Try to close modal
                await self.page.keyboard.press("Escape")
                return
                
            # 3. Find the container for this section
            # Usually the check boxes are in a UL/fieldset following the header
            # We can use xpath or near logic, but let's try finding the parent container
            section = header.locator('xpath=..').locator('xpath=..') # Go up a couple levels to find the group
            
            # 4. Find checkboxes in this section
            items = await section.locator('li label').all()
            if not items:
                items = await section.locator('label').all()
            if len(items) > index:
                await items[index].click()
                logger.info(f"Clicked filter option at index {index}")
                await self.wait_and_focus(1)
            else:
                logger.warning(f"Filter index {index} out of range (found {len(items)} options)")

            # 5. Click "Show results"
            # Usually strict button class
            apply_btn = self.page.locator('[data-test-reusables-filter-modal-show-results]').first
            if not await apply_btn.count():
                 apply_btn = self.page.locator('button:has-text("Show results")').last
            
            if await apply_btn.count():
                await apply_btn.click()
                await self.wait_and_focus(3) # Wait for reload
            else:
                 # Try Escape if apply not found
                 await self.page.keyboard.press("Escape")

        except Exception as e:
            logger.warning(f"Error applying filter: {e}")

    async def apply_search_filters(self, filters: dict) -> None:
        """
        Apply multiple filters from the 'All filters' panel.
        
        Args:
           filters: Dict of category -> [list of option texts to select]
                   e.g. { "Locations": ["India"], "Current company": ["Google"] }
        """
        if not filters:
            return

        try:
            logger.info(f"Applying filters: {filters}")
            
            # 1. Open "All filters"
            btn = self.page.locator('.search-reusables__all-filters-pill-button').first
            if not await btn.count():
                btn = self.page.locator('button:has-text("All filters")').first
                
            if await btn.count():
                await btn.click()
                await self.wait_and_focus(2) 
            else:
                logger.warning("Could not find 'All filters' button")
                return

            # 2. Iterate through requested filters
            for category, wanted_options in filters.items():
                if not wanted_options:
                    continue
                
                # Convert single string to list
                if isinstance(wanted_options, str):
                    wanted_options = [wanted_options]
                    
                # Find the filter section
                # Try exact match for h3 or div headers
                header = self.page.locator(f'h3:has-text("{category}")').first
                if not await header.count():
                     header = self.page.locator(f'.reusable-search-filters__filter-list-title:has-text("{category}")').first
                
                if not await header.count():
                    logger.warning(f"Filter section '{category}' not found")
                    continue
                
                # Find container
                section = header.locator('xpath=..')
                
                # Check directly in this section first
                labels = await section.locator('label').all()
                if not labels:
                     # Go up one level (sometimes header is sibling to fieldset)
                     section = section.locator('xpath=..')
                     labels = await section.locator('label').all()
                
                # Find matching options
                found_any = False
                for label in labels:
                    text_content = await label.inner_text()
                    # Clean text (remove hidden counts etc)
                    text_clean = text_content.split('\n')[0].strip()
                    
                    if text_clean in wanted_options:
                        # Check if already checked?
                        input_el = label.locator('xpath=preceding-sibling::input | descendant::input').first
                        
                        is_checked = False
                        if await input_el.count():
                            is_checked = await input_el.is_checked()
                        
                        if not is_checked:
                            await label.click()
                            logger.info(f"Selected '{text_clean}' in '{category}'")
                            await self.wait_and_focus(0.5)
                        else:
                            logger.info(f"'{text_clean}' already selected")
                        found_any = True

                if not found_any:
                    logger.warning(f"Could not find any of options {wanted_options} in '{category}'")

            # 3. Click "Show results"
            # It might say "Show 5 results" so exact text match "Show results" might fail
            apply_btn = self.page.locator('[data-test-reusables-filter-modal-show-results]').first
            
            if not await apply_btn.count():
                # Look for the footer button container
                apply_btn = self.page.locator('.reusable-search-filters-buttons button').last
                
            if not await apply_btn.count():
                 # Try finding a button that contains "Show" and "results" (case insensitive usually ok with regex but has-text is simpler)
                 # matches "Show 5 results"
                 apply_btn = self.page.locator('button:has-text("Show"):has-text("results")').last
            
            if await apply_btn.count():
                logger.info("Found 'Show results' button, clicking...")
                # Sometimes there are two buttons (Reset, Show results) in the footer.
                # We want the second one usually, or the primary one.
                # Let's ensure it's visible.
                if await apply_btn.count() > 1:
                    # If multiple found by loose selector, pick the last one (usually "Show results" is on the right)
                    apply_btn = apply_btn.last
                
                # Check visibility
                if await apply_btn.is_visible():
                     await apply_btn.click()
                else:
                     # Force click
                     await apply_btn.dispatch_event('click')
                     
                await self.wait_and_focus(3)
            else:
                 logger.warning("Could not find 'Show results' button, trying Enter key...")
                 await self.page.keyboard.press("Enter")
                 await self.wait_and_focus(3)
                 # If that didn't work, Escape to at least close modal
                 # await self.page.keyboard.press("Escape")

        except Exception as e:
            logger.warning(f"Error applying filters: {e}")

    async def get_all_filters(self) -> dict:
        """
        Scrape all available filters from the 'All filters' modal.
        
        Returns:
            Dictionary where keys are filter categories and values are lists of options.
        """
        filters_data = {}
        try:
            logger.info("Scraping all available filters...")
            
            # 1. Open "All filters"
            btn = self.page.locator('.search-reusables__all-filters-pill-button').first
            if not await btn.count():
                btn = self.page.locator('button:has-text("All filters")').first
                
            if await btn.count():
                await btn.click()
                await self.wait_and_focus(3) # Wait for modal animation
            else:
                logger.warning("Could not find 'All filters' button")
                return {}

            # 2. Iterate over all filter categories
            # Categories are usually grouped in separate containers.
            # We can find all the headers, then look at their siblings/parents.
            
            # Common selector for filter group titles
            # Try specific class first, then generic h3 within the modal
            modal = self.page.locator('.artdeco-modal__content').first
            if not await modal.count():
                 # Maybe it's not in a modal but a side panel? Use body as fallback
                 modal = self.page.locator('body')

            headers = await modal.locator('.reusable-search-filters__filter-list-title, h3.search-reusables__filter-list-title').all()
            
            if not headers:
                # Fallback: Just look for all h3 in the modal context
                headers = await modal.locator('h3').all()

            for header in headers:
                try:
                    title = await header.inner_text()
                    title = title.strip()
                    if not title or title.lower() == "filter by": 
                        continue
                        
                    options = []
                    
                    # Strategy: Find the container associated with this header.
                    # Usually header is part of a <li> or <div> that also contains the values.
                    # Go up one level to find the section wrapper
                    section = header.locator('xpath=..')
                    
                    # Sometimes we need to go up two levels depending on nesting
                    # <li class="reusable-search-filters__filter-list-item">
                    #   <h3 ...>Title</h3>
                    #   <fieldset>...</fieldset>
                    # </li>
                    
                    # Find all labels inside this section
                    labels = await section.locator('label').all()
                    
                    # If no labels found immediately, maybe the structure is deeper
                    if not labels:
                        section = section.locator('xpath=..')
                        labels = await section.locator('label').all()

                    for label in labels:
                        text = await label.inner_text()
                        # Clean text
                        # Often has "Filter by attribute" hidden text
                        text = text.split('\n')[0].strip()
                        if text:
                            options.append(text)
                            
                    # Special case for "Add a ..." buttons which might not be labels
                    # e.g. "Add a company"
                    add_btns = await section.locator('button[aria-label^="Add a"]').all()
                    for btn in add_btns:
                        aria = await btn.get_attribute('aria-label')
                        if aria:
                            options.append(aria)

                    if options:
                        filters_data[title] = options
                except Exception as ex:
                    logger.debug(f"Error parsing filter section: {ex}")
                    continue

            # Close modal
            await self.page.keyboard.press("Escape")
            await self.wait_and_focus(1)
            
            logger.info(f"Found {len(filters_data)} filter categories")

        except Exception as e:
            logger.error(f"Error scraping filters: {e}")
            # Ensure we try to close modal if open
            try:
                await self.page.keyboard.press("Escape")
            except:
                pass
            
        return filters_data

    async def scrape(self, search_url: str, max_scrolls: int = 5) -> SearchResults:
        """
        Scrape LinkedIn search results.
        
        Args:
            search_url: LinkedIn search URL
            max_scrolls: Number of times to scroll to bottom (default: 5)
            
        Returns:
            SearchResults object with all scraped items
            
        Raises:
            AuthenticationError: If not logged in
            ScrapingError: If scraping fails
        """
        await self.callback.on_start("search", search_url)
        
        try:
            # Navigate to search page
            await self.navigate_and_wait(search_url)
            
            # Brief wait for page load (SPA)
            await self.wait_and_focus(3)
            
            # Check login
            await self.ensure_logged_in()
            
            # Wait for any search result container or list
            # We try a few common selectors for search results
            try:
                await self.page.wait_for_selector(
                    '.reusable-search__entity-result-list, .search-results-container, .search-no-results__container', 
                    timeout=15000
                )
            except Exception:
                # If timeout, try to capture debugging info
                logger.warning("Timeout waiting for search results.")
                try:
                    # Save a screenshot if possible (helpful for user debugging)
                    await self.page.screenshot(path="debug_search_error.png")
                    content = await self.page.content()
                    with open("debug_search_page.html", "w", encoding="utf-8") as f:
                        f.write(content)
                    logger.info("Saved debug screenshot and HTML to current directory.")
                except:
                    pass
                # Don't raise immediately, let's see if we can find anything anyway
            
            await self.wait_and_focus(1)
            
            # Scroll to load content
            await self.scroll_page_to_half()
            await self.scroll_page_to_bottom(pause_time=0.8, max_scrolls=max_scrolls)
            
            # Scrape results
            results = await self._get_search_results()
            await self.callback.on_progress(f"Found {len(results)} items", 80)
            
            # Get total count (optional)
            total_count = await self._get_total_count()
            
            # Extract keyword from URL for metadata
            parsed = urllib.parse.urlparse(search_url)
            qs = urllib.parse.parse_qs(parsed.query)
            keyword = qs.get("keywords", [""])[0]
            
            search_results = SearchResults(
                keyword=keyword,
                results=results,
                total_results_count=total_count
            )
            
            await self.callback.on_progress("Scraping complete", 100)
            await self.callback.on_complete("search", search_results)
            
            return search_results
            
        except Exception as e:
            await self.callback.on_error(e)
            raise ScrapingError(f"Failed to scrape search results: {e}")
    
    async def _get_search_results(self) -> List[SearchResultItem]:
        """Extract items from the search results list."""
        results = []
        
        try:
            # Get all result containers
            # Try main list items first
            containers = await self.page.locator('.reusable-search__result-container, .MZSsfLiODzNiMICsktYVYtWEZnsHvEMmiGYEI, .feed-shared-update-v2, [data-view-name="search-entity-result-universal-template"]').all()
            
            # If no containers, check for generic list items
            if not containers:
                containers = await self.page.locator('li.reusable-search__result-container').all()
            
            # If no standard search results, check for feed updates (posts)
            if not containers:
                containers = await self.page.locator('.feed-shared-update-v2').all()
                logger.info(f"Found {len(containers)} feed update items")
            
            # Fallback: generic list items in search results
            if not containers:
                containers = await self.page.locator('li.reusable-search__result-container').all()
            
            for container in containers:
                try:
                    item = await self._parse_result_item(container)
                    if item:
                        results.append(item)
                except Exception as e:
                    logger.debug(f"Error parsing search item: {e}")
                    continue
            
            if len(results) == 0:
                logger.warning("No results found after parsing.")
                # Capture debug info for why parsing failed even if containers were found
                try:
                    content = await self.page.content()
                    with open("debug_search_empty_results.html", "w", encoding="utf-8") as f:
                        f.write(content)
                    logger.info("Saved debug_search_empty_results.html")
                except:
                    pass
                    
        except Exception as e:
            logger.warning(f"Error getting search results: {e}")
            
        return results
    
    async def _parse_result_item(self, container) -> Optional[SearchResultItem]:
        """Parse a single search result container."""
        try:
            # Check if this is a feed update (post)
            is_feed_update = await container.get_attribute('data-urn')
            # Check for feed classes OR if it has feed-specific children
            if is_feed_update or await container.locator('.feed-shared-actor__name, .update-components-actor__name').count() > 0:
                return await self._parse_feed_update(container)

            # Check for the obfuscated class structure (Groups/Entities)
            if await container.locator('.EeWfmliFBGDFOQIgiNdLqeTDJsJRuovYEw').count() > 0:
                 # This is the "Group" container structure found in debug
                 # We need to dig into the .EeWfmliFBGDFOQIgiNdLqeTDJsJRuovYEw div
                 real_container = container.locator('.EeWfmliFBGDFOQIgiNdLqeTDJsJRuovYEw').first
                 return await self._parse_result_item(real_container)
                 
            # Standard search result parsing
            # Title and Link
            # usually inside .entity-result__title-text
            title_el = container.locator('.entity-result__title-text a').first
            
            # If not found (sometimes structure varies), try just .app-aware-link or data-test-app-aware-link
            if not await title_el.count():
                # Prefer one without image (usually the text link)
                links = await container.locator('.app-aware-link, [data-test-app-aware-link]').all()
                for link in links:
                    if await link.locator('img').count() == 0:
                         t = await link.inner_text()
                         if t.strip():
                             title_el = link
                             break
                # If loop finishes without assignment, title_el is still the empty locator from above?
                # No, we need to reset title_el if we didn't find a good one, so the Heavy Fallback runs.
                if not await title_el.count():
                     # If we found links but none matched criteria, maybe just take the 2nd one?
                     if len(links) >= 2:
                         title_el = links[1]
            
            # Heavy Fallback for obfuscated results: Find first anchor with /in/ (people) or /company/ and text
            if not await title_el.count():
                # Get all anchors
                anchors = await container.locator('a').all()
                for anchor in anchors:
                    href = await anchor.get_attribute('href')
                    if href and ('/in/' in href or '/company/' in href or '/groups/' in href):
                        # Check if it has text and is not just an image wrapper
                        has_img = await anchor.locator('img, .ivm-view-attr__img--centered').count() > 0
                        text = await anchor.inner_text()
                        if not has_img and text and len(text.strip()) > 0:
                            title_el = anchor
                            break
            
            if not await title_el.count():
                # If we still can't find a title, this might not be a valid result container 
                # or it's a "headless" result (e.g. "LinkedIn Member")
                return None
                
            url = await title_el.get_attribute('href')
            title = await title_el.inner_text()
            # Clean title (often has "View profile" hidden text)
            # Actually inner_text() usually respects visually hidden, but sometimes we get garbage.
            # Usually: "Name\nView Name's profile"
            title = title.split('\n')[0].strip()
            
            # Subtitle (Headline)
            subtitle = ""
            sub_el = container.locator('.entity-result__primary-subtitle').first
            if not await sub_el.count():
                 # Fallback for obfuscated: usually a div with t-14 t-black t-normal (Headline)
                 sub_el = container.locator('.t-14.t-black.t-normal').first

            if await sub_el.count():
                subtitle = await sub_el.inner_text()
            
            # Secondary Subtitle (Location)
            secondary = ""
            sec_el = container.locator('.entity-result__secondary-subtitle').first
            if not await sec_el.count():
                # Fallback for obfuscated: Location often uses t-14 t-normal t-black--light or just t-14 t-normal 
                # but we must distinguish from headline. 
                # If we found headline using utility classes, location might be the next one.
                # Let's try .t-14.t-normal.t-black--light first (common for location)
                sec_el = container.locator('.t-14.t-normal.t-black--light').first
                if not await sec_el.count():
                     # Try generic t-14 t-normal that is NOT the headline (if headline found)
                     pass

            if await sec_el.count():
                secondary = await sec_el.inner_text()
            
            # Summary (e.g. for posts/people info)
            summary = ""
            sum_el = container.locator('.entity-result__summary').first
            if not await sum_el.count():
                sum_el = container.locator('.entity-result__content-summary').first
            
            if await sum_el.count():
                summary = await sum_el.inner_text()
            
            # Image
            image_url = ""
            img_el = container.locator('img').first
            if await img_el.count():
                image_url = await img_el.get_attribute('src')
                
            # URN ID (often in data-urn or calculated from URL)
            urn_id = None
            # Extract from div data-chameleon-result-urn or similar if available
            # Or from container parent li data-urn
            # But container is the div usually.
            
            return SearchResultItem(
                url=url.split('?')[0] if url else None, # Clean URL
                title=title,
                subtitle=subtitle.strip() if subtitle else None,
                secondary_subtitle=secondary.strip() if secondary else None,
                summary=summary.strip() if summary else None,
                image_url=image_url
            )
            
        except Exception as e:
            logger.debug(f"Error parsing item detail: {e}")
            return None
            
    async def _parse_feed_update(self, container) -> Optional[SearchResultItem]:
        """Parse a feed update (post) item."""
        try:
            # Author/Actor
            title = ""
            author_el = container.locator('.feed-shared-actor__name').first
            if not await author_el.count():
                # Fallback for some views
                author_el = container.locator('.update-components-actor__name').first
            
            if await author_el.count():
                title = await author_el.inner_text()
                # Clean up visually hidden text if present
                title = title.split('\n')[0].strip()
                
            # Content / Summary
            summary = ""
            desc_el = container.locator('.feed-shared-update-v2__description-wrapper').first
            if not await desc_el.count():
                 desc_el = container.locator('.update-components-text').first

            if await desc_el.count():
                summary = await desc_el.inner_text()
            
            # Link (timestamp link is usually the permalink)
            url = ""
            # Often the timestamp is the link to the post
            link_el = container.locator('a.feed-shared-actor__sub-description').first # Timestamp link
            if not await link_el.count():
                link_el = container.locator('a.app-aware-link').first
            if await link_el.count():
                url = await link_el.get_attribute('href')
                
            # Image (if any)
            image_url = ""
            img_el = container.locator('.ivm-view-attr__img--centered').first
            if await img_el.count():
                image_url = await img_el.get_attribute('src')

            return SearchResultItem(
                url=url.split('?')[0] if url else None,
                title=title.strip(),
                subtitle="Post", # Hardcode as Post since we know it's a feed update
                summary=summary.strip() if summary else None,
                image_url=image_url
            )
        except Exception as e:
            logger.debug(f"Error parsing feed update: {e}")
            return None

    async def _get_total_count(self) -> Optional[int]:
        """Get the total number of results found."""
        try:
            # Usually "About 1,200 results" in h2
            # Selector: .search-results-container h2
            header = self.page.locator('.search-results-container h2').first
            if await header.count():
                text = await header.inner_text()
                # Parse "1,200" from text
                # Simple implementation: keep only digits
                digits = "".join(filter(str.isdigit, text))
                if digits:
                    return int(digits)
            return None
        except:
            return None
