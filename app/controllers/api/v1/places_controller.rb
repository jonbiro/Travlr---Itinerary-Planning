class Api::V1::PlacesController < ApplicationController
  include ResourceScope

  before_action :set_place, only: [:show, :update, :destroy]

  # GET /places
  def index
    @places = Place.where(city_id: City.where(trip_id: accessible_trips.select(:id)).select(:id))
    render json: @places
  end

  # GET /places/1
  def show
    render json: @place
  end

  # POST /places
  def create
    city = City.where(trip_id: accessible_trips.select(:id)).find_by(id: place_params[:city_id])
    return forbidden!("You must belong to the trip containing this city") unless city

    @place = city.places.new(place_params.except(:city_id))

    if @place.save
      render json: @place, status: :created
    else
      render json: @place.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /places/1
  def update
    if @place.update(place_params.except(:city_id))
      render json: @place
    else
      render json: @place.errors, status: :unprocessable_entity
    end
  end

  # DELETE /places/1
  def destroy
    @place.destroy
    head :no_content
  end

  private

  # Use callbacks to share common setup or constraints between actions.
  def set_place
    @place = Place.where(city_id: City.where(trip_id: accessible_trips.select(:id)).select(:id)).find_by(id: params[:id])
    not_found!("Place") unless @place
  end

  # Only allow a trusted parameter "white list" through.
  def place_params
    params.require(:place).permit(:name, :address, :phone_number, :lng, :lat, :category, :rating, :price, :photo, :reason, :google_url, :url, :city_id)
  end
end
